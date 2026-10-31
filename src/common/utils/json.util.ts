import { protocolWrite } from '../protocol/protocol-log';

/**
 * Порт классов `jSon` (public/helpers/jsTools.js) и функций
 * ParsingJson/UnParsingJson (public/helpers/jsonTools.js).
 * Поведение сохранено: при пустом значении или ошибке возвращается "" и
 * пишется запись в протокол BeginProccess.
 */
export function safeStringify(value: unknown): string {
  try {
    if (value) return JSON.stringify(value);
    void protocolWrite(
      `| ClassName : | jsonTools | MethodName : | parsingjson | Object : | ${String(value)} | Json_stringify_Exception : | Object is empty or null |`,
      'BeginProccess',
      'Server',
      false,
      true,
    );
  } catch (err) {
    void protocolWrite(
      `| ClassName : | jsonTools | MethodName : | parsingjson | Object : | ${String(value)} | Json_stringify_Exception : | ${(err as Error).message} |`,
      'BeginProccess',
      'Server',
      false,
      true,
    );
  }
  return '';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function safeParse(value: unknown): any {
  try {
    if (value) return JSON.parse(value as string);
    void protocolWrite(
      `| ClassName : | jsonTools | MethodName : | unParsingJson | String_Value : | ${String(value)} | Json_parse_Exception : | Object is empty or null |`,
      'BeginProccess',
      'Server',
      false,
      true,
    );
  } catch (err) {
    void protocolWrite(
      `| ClassName : | jsonTools | MethodName : | unParsingJson | String_Value : | ${String(value)} | Json_parse_Exception : | ${(err as Error).message} |`,
      'BeginProccess',
      'Server',
      false,
      true,
    );
  }
  return '';
}
