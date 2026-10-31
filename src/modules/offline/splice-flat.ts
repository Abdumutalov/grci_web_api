import { Row } from '../../database/oracle-types';

/** Позиция поля в строке плоского файла → имя колонки. */
type FieldMap = Record<number, string>;

/** Отчёт 009 (операции). */
const MAP_009: FieldMap = {
  0: 'DATA',
  1: 'TYPE',
  2: 'BRANCH',
  3: 'OFFICE',
  4: 'CONTRACT',
  5: 'CLAIM',
  6: 'TRANSACTION',
  7: 'OPERATION_TYPE',
  8: 'LOAN_TYPE',
  9: 'PAYMENT_TYPE',
  10: 'PAYMENT_NUM',
  11: 'PAYER_BRANCH',
  12: 'PAYER_ACCOUNT',
  13: 'PAYEE_BRANCH',
  14: 'PAYEE_ACCOUNT',
  15: 'AMOUNT',
  16: 'PAYER_NAME',
  17: 'PAYEE_NAME',
  18: 'PURPOSE_CODE',
  19: 'PURPOSE_TEXT',
};

/** Прочие отчёты (баланс). */
const MAP_DEFAULT: FieldMap = {
  0: 'DATA',
  1: 'TYPE',
  2: 'BRANCH',
  3: 'OFFICE',
  4: 'CONTRACT',
  5: 'CLAIM',
  6: 'ACCOUNT',
  7: 'BEGIN',
  8: 'DEBET',
  9: 'CREDET',
  10: 'END',
};

/**
 * Разбор строк плоского файла (CONTENT_IN, разделитель \x1D) — порт spliceFlat
 * из controllers/offline/observable/response/controller.js.
 *
 * type === 1 — дополнительно отдаются ERROR, FK_JOURNAL_*, CONTENT_IN/OUT.
 * ВНИМАНИЕ: model === null (ошибка БД) → TypeError на forEach → HTTP 500, как в оригинале.
 */
export function spliceFlat(model: Row[] | null, type: number): Row[] {
  const array_: Row[] = [];

  const parseContentIn = (element: Row, obj: Row, map: FieldMap): void => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    (element.CONTENT_IN as string).split('\x1D').forEach((value: string, position: number) => {
      if (map[position]) {
        obj[map[position]] = value;
      }
    });
  };

  (model as Row[]).forEach((element) => {
    const obj: Row = {
      LINE: element.LINE,
      REPORT: element.REPORT,
      FK_MAIL_REGISTER: element.FK_MAIL_REGISTER,
    };

    if (type === 1) {
      Object.assign(obj, {
        ERROR: element.ERROR,
        FK_JOURNAL_OUT: element.FK_JOURNAL_OUT,
        FK_JOURNAL_IN: element.FK_JOURNAL_IN,
        CONTENT_IN: element.CONTENT_IN,
        CONTENT_OUT: element.CONTENT_OUT,
      });
    }

    if (element.CONTENT_IN) {
      const map = obj.REPORT === '009' ? MAP_009 : MAP_DEFAULT;
      parseContentIn(element, obj, map);
    }

    array_.push(obj);
  });

  return array_;
}
