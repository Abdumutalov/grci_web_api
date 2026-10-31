import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { getHHMMSS } from '../common/utils/date-time.util';

export interface CryptoCheckResult {
  code: '0' | '1';
  message: string;
  requestTime: string;
  responseTime: string;
  xmlRequest: string;
  xmlResponse: string;
}

export interface CryptoSignInfo {
  userId: string;
  code: string;
  message: string;
}

/**
 * Проверка ЭЦП через SOAP-сервис CBRU TCrypt — порт public/helpers/crypto.js (`cripto`)
 * и `convertXml` из controllers/users/model.js.
 *
 * Отличие от оригинала: в model.js `xml2js` использовался без require и не был
 * в зависимостях, поэтому вход по ЭЦП всегда заканчивался «Техническая ошибка
 * системы». Здесь разбор ответа реализован как задумывалось.
 */
@Injectable()
export class CryptoSignService {
  constructor(private readonly config: ConfigService) {}

  private request(content: string): string {
    return `<?xml version="1.0"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:tns="http://cbru.org/tcrypt/authsrv" xmlns:tm="http://microsoft.com/wsdl/mime/textMatching/">
      <soap:Body>
        <VerifyAndGetCmsContentAS xmlns="http://cbru.org/tcrypt/authsrv">
          <cms>${content}</cms>
          <docnum>1</docnum>
          <codepage>1251</codepage>
        </VerifyAndGetCmsContentAS>
      </soap:Body>
    </soap:Envelope>`;
  }

  private response(
    code: '0' | '1',
    message: string,
    requestTime: string,
    responseTime: string,
    xmlRequest: string,
    xmlResponse: string,
  ): CryptoCheckResult {
    return { code, message, requestTime, responseTime, xmlRequest, xmlResponse };
  }

  /**
   * @param content JSON-строка вида `{"signedMsg": "<CMS base64>"}` (поле `cripto` тела /user/login)
   */
  async check(content: string): Promise<CryptoCheckResult> {
    const bodyContent = JSON.parse(content) as { signedMsg: string };
    const xmlRequest = this.request(bodyContent.signedMsg);
    const url = this.config.get<string>('CRYPTO_URL') || 'http://cripto/tcas/CBRUTcryptAS.asmx?wsdl';
    const reqTime = getHHMMSS();
    try {
      const response = await axios.post<string>(url, xmlRequest, {
        headers: {
          'Content-Type': 'text/xml;charset=1251',
          SOAPAction: 'http://cbru.org/tcrypt/authsrv/VerifyAndGetCmsContentAS',
        },
        timeout: 1000 * 10,
        responseType: 'text',
      });
      const xml = String(response.data)
        .replace(/[\n\r]/g, '\\n')
        .replace(/&/g, '&amp;')
        .replace(/-/g, '&#45;');
      return this.response('1', 'Успешно', reqTime, getHHMMSS(), xmlRequest, xml);
    } catch (error) {
      const code = (error as { code?: string }).code;
      const message =
        code === 'ECONNABORTED'
          ? 'Ошибка, истекло время ожидания ответа на запрос электронной цифорой подписи'
          : 'Ошибка, сервис Электронной цифорой подписи не доступен';
      return this.response('0', message, reqTime, getHHMMSS(), xmlRequest, '');
    }
  }

  /** Разбор SOAP-ответа VerifyAndGetCmsContentAS: ID пользователя (без префикса CBRU_), код и сообщение. */
  async parse(xml: string): Promise<CryptoSignInfo | undefined> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result: any = await parseStringPromise(xml, { mergeAttrs: true });
      const strings =
        result['soap:Envelope']['soap:Body'][0].VerifyAndGetCmsContentASResponse[0].VerifyAndGetCmsContentASResult[0]
          .string;
      return {
        userId: String(strings[3]).replace('CBRU_', ''),
        code: strings[0],
        message: strings[1],
      };
    } catch (err) {
      console.log(err);
      return undefined;
    }
  }
}
