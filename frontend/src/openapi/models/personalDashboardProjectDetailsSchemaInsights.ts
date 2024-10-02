/**
 * Generated by Orval
 * Do not edit manually.
 * See `gen:api` script in package.json
 */

/**
 * Insights for the project
 */
export type PersonalDashboardProjectDetailsSchemaInsights = {
    /**
     * The average health score in the current window of the last 4 weeks
     * @nullable
     */
    avgHealthCurrentWindow: number | null;
    /**
     * The average health score in the previous 4 weeks before the current window
     * @nullable
     */
    avgHealthPastWindow: number | null;
};