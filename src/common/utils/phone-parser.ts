import { PhoneNumber, PhoneNumberUtil } from "google-libphonenumber";
import { replace } from "lodash";
import { isNilOrEmpty } from '..';

export class PhoneParser {
  private phoneParser: PhoneNumberUtil;
  private _parsedPhone: PhoneNumber | null;
  private _countryCode: string | null;
  private _countryDialCode: string | null;
  private _phoneNumber: string | null;
  private _completePhone: string | null;
  private _isValid = false;
  
  constructor(phone: string) {
    try {
      this.phoneParser = PhoneNumberUtil.getInstance();
      this._parsedPhone = this.phoneParser.parse(phone);
      this._isValid = this.phoneParser.isValidNumber(this._parsedPhone);
      if (this._isValid) {
        this._countryCode = this.phoneParser.getRegionCodeForNumber(this._parsedPhone).toString();

        if (!isNilOrEmpty(this._countryCode)) {
          this._countryDialCode = this._parsedPhone.getCountryCode().toString();
          this._phoneNumber = this._parsedPhone.getNationalNumber().toString();
          this._completePhone = phone;
        } else {
          this._isValid = false;
        }
      }
    } catch {
      this._isValid = false;
    }
  }

  public get isValid(): boolean {
    return this._isValid;
  }

  public get phoneNumber(): string {
    return this._phoneNumber;
  }

  public get countryCode(): string {
    return this._countryCode;
  }

  public get countryDialCode(): string {
    return this._countryDialCode;
  }

  public get completePhone(): string {
    return replace(this._completePhone, /[^\d+]/g, "");
  }

  public equals(phoneNumber: string, countryDialCode: string): boolean {
    return this.countryDialCode === countryDialCode && this.phoneNumber === phoneNumber;
  }
}
