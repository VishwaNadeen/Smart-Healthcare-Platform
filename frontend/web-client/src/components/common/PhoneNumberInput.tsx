import {
  buildCountryData,
  defaultCountries,
  PhoneInput,
} from "react-international-phone";
import type { CSSProperties } from "react";
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
  sizeVariant?: "default" | "large";
};

export default function PhoneNumberInput({
  value,
  onChange,
  onBlur,
  error = "",
  disabled = false,
  defaultCountry = "lk", // Sri Lanka default
  sizeVariant = "default",
}: PhoneNumberInputProps) {
  const largeVariant = sizeVariant === "large";
  const largeControlHeight = 56;
  const sharedStyle = largeVariant
    ? ({
        ["--react-international-phone-height" as string]: `${largeControlHeight}px`,
        ["--react-international-phone-border-radius" as string]: "1rem",
        ["--react-international-phone-font-size" as string]: "0.875rem",
      } as CSSProperties)
    : undefined;

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
        className="w-full"
        style={sharedStyle}
        inputClassName={`w-full border text-sm text-slate-800 focus:outline-none ${
          largeVariant
            ? "rounded-r-2xl rounded-l-none px-4 py-3.5"
            : "rounded-r-xl rounded-l-none px-4 py-3"
        } ${
          error ? "border-red-400" : "border-slate-300"
        } ${disabled ? "cursor-not-allowed bg-slate-100" : "bg-white"}`}
        countrySelectorStyleProps={{
          buttonStyle: largeVariant
            ? {
                height: `${largeControlHeight}px`,
                minHeight: `${largeControlHeight}px`,
              }
            : undefined,
          buttonClassName: `border-y border-l ${
            largeVariant ? "rounded-l-2xl" : "rounded-l-xl"
          } ${
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
