export default interface ISettings {
  registrationOpeningDate?: Date | string;
  registrationClosingDate?: Date | string;
  confirmationDate?: Date | string;
  checkInOpeningDate?: Date | string;
  checkInClosingDate?: Date | string;
  maxCapacity?: number;
}
