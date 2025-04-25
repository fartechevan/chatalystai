
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { parse } from "https://deno.land/x/csv@v0.9.2/mod.ts";
import { CsvRow } from "./types.ts";

// Define expected CSV headers (lowercase for case-insensitive matching)
const EXPECTED_PHONE_HEADER = "phone_number";
const OPTIONAL_NAME_HEADER = "name";

/**
 * Parses CSV string data, validates headers and rows.
 *
 * @param csvString The raw CSV data as a string.
 * @param columnMapping Optional mapping for headers.
 * @returns An array of parsed CsvRow objects.
 * @throws Error on parsing errors or validation failures.
 */
export async function parseCsvData(
    csvString: string,
    columnMapping?: { [key: string]: string }
): Promise<CsvRow[]> {
    let parsedData: CsvRow[];
    let headers: string[];
    try {
        const result = await parse(csvString, { skipFirstRow: true });
        const rawHeaders = await parse(csvString, { skipFirstRow: false, parse: (input) => input });
        if (!rawHeaders || rawHeaders.length === 0) throw new Error("CSV is empty or header row is missing.");
        headers = (rawHeaders[0] as string[]).map(h => h.trim().toLowerCase());

        // Check for phone number header (considering mapping)
        const phoneHeader = headers.find(h =>
            h === EXPECTED_PHONE_HEADER || (columnMapping && columnMapping[h] === EXPECTED_PHONE_HEADER)
        );
        if (!phoneHeader) {
            throw new Error(`Required header '${EXPECTED_PHONE_HEADER}' not found or mapped.`);
        }

        parsedData = result.map((row, index): CsvRow => {
            const rowData: CsvRow = { phone_number: '' };
            headers.forEach((header, i) => {
                const csvValue = (row[i] as string)?.trim() || '';
                const targetKey = columnMapping?.[header] || header;

                if (targetKey === EXPECTED_PHONE_HEADER) {
                    rowData.phone_number = csvValue;
                } else if (targetKey === OPTIONAL_NAME_HEADER) {
                    rowData.name = csvValue || undefined; // Store empty string as undefined for name
                } else {
                    rowData[header] = csvValue || undefined; // Store other columns
                }
            });
            if (!rowData.phone_number) {
                throw new Error(`Missing phone number in CSV row ${index + 2}`);
            }
            return rowData;
        });

    } catch (parseError) {
        console.error("CSV parsing error:", parseError);
        throw new Error(`CSV Parsing Error: ${parseError.message}`);
    }

    if (parsedData.length === 0) {
        throw new Error("No data rows found in CSV.");
    }
    return parsedData;
}
