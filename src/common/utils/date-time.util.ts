import moment from 'moment';

/** Порт public/helpers/dateTime.js */
export const getDDMMYYYY = (): string => moment(new Date()).format('DDMMYYYY');
export const getMMDDYYYY = (): string => moment(new Date()).format('MMDDYYYY');
export const getHHMMSS = (): string => moment(new Date()).format('HH:mm:ss');
export const getDateTime = (): string => moment(new Date()).format('DD.MM.YYYY HH:mm:ss');
