import type { NumberLocale, TimeLocale } from "vega";

/** Spanish number and date formats for Vega, so chart axes read like the rest of the interface. */
export const CHART_LOCALE: {
  readonly formatLocale: NumberLocale;
  readonly timeFormatLocale: TimeLocale;
} = {
  formatLocale: {
    decimal: ",",
    thousands: ".",
    grouping: [3],
    currency: ["", " €"],
  },
  timeFormatLocale: {
    dateTime: "%A, %e de %B de %Y, %X",
    date: "%d/%m/%Y",
    time: "%H:%M:%S",
    periods: ["a. m.", "p. m."],
    days: ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"],
    shortDays: ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"],
    months: [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ],
    shortMonths: [
      "ene",
      "feb",
      "mar",
      "abr",
      "may",
      "jun",
      "jul",
      "ago",
      "sep",
      "oct",
      "nov",
      "dic",
    ],
  },
};
