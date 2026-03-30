import {
  buildCountryData,
  defaultCountries,
  PhoneInput,
} from "react-international-phone";
import "react-international-phone/style.css";

const countries = defaultCountries.map((country) =>
  country[1] === "lk"
    ? buildCountryData({
        name: "Sri Lanka",
        iso2: "lk",
        dialCode: "94",
        format: ".. ... ....",
        priority: 0,
        areaCodes: [],
      })
    : country
);

type PhoneNumberInputProps = {
  value: string;
  onChange: (phone: string, countryCode: string) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  defaultCountry?: string;
};

export default function PhoneNumberInput({
  value,
  onChange,
  onBlur,
  error = "",
  disabled = false,
  defaultCountry = "lk", // Sri Lanka default
}: PhoneNumberInputProps) {
  return (
    <div>
      <PhoneInput
        countries={countries}
        defaultCountry={defaultCountry}
        defaultMask=".........."
        value={value}
        onChange={(phone, meta) => onChange(phone, `+${meta.country.dialCode}`)}
        onBlur={onBlur}
        disabled={disabled}
        forceDialCode
        inputClassName={`w-full rounded-xl border px-4 py-3 text-sm text-slate-800 focus:outline-none ${
          error ? "border-red-400" : "border-slate-300"
        } ${disabled ? "cursor-not-allowed bg-slate-100" : "bg-white"}`}
        countrySelectorStyleProps={{
          buttonClassName: `rounded-l-xl border-y border-l ${
            error ? "border-red-400" : "border-slate-300"
          } ${disabled ? "bg-slate-100" : "bg-white"}`,
          dropdownStyleProps: {
            className: "text-sm",
          },
        }}
      />

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
