export enum OutputFormat {
  Json = "json",
  Csv = "csv",
  Tsv = "tsv",
  Md = "md",
  Html = "html",
}

export function parseCommaSeparated(value: string): string[] {
  return value
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

export function parseOutputFormat(
  value: true | string | undefined,
): OutputFormat | OutputFormat[] | undefined {
  if (value === undefined) return undefined;
  if (value === true) return OutputFormat.Json;

  const formatMap: Record<string, OutputFormat> = {
    json: OutputFormat.Json,
    csv: OutputFormat.Csv,
    tsv: OutputFormat.Tsv,
    md: OutputFormat.Md,
    html: OutputFormat.Html,
  };

  const formats = parseCommaSeparated(value)
    .map((f) => formatMap[f.toLowerCase()])
    .filter((f): f is OutputFormat => f !== undefined);

  return formats.length > 0
    ? formats.length === 1
      ? formats[0]
      : formats
    : undefined;
}

export function getFormatExtension(format: OutputFormat): string {
  switch (format) {
    case OutputFormat.Json:
      return "json";
    case OutputFormat.Csv:
      return "csv";
    case OutputFormat.Tsv:
      return "tsv";
    case OutputFormat.Md:
      return "md";
    case OutputFormat.Html:
      return "html";
  }
}
