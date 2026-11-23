import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDay } from '../format';
import type { InsightPoint } from '../types';

export interface InsightsTableProps {
    points: readonly InsightPoint[];
}

/** The charts' figures as rows, latest day first — the accessible view of the same data (A11Y-6). */
export function InsightsTable({ points }: InsightsTableProps): ReactElement {
    const { t, i18n } = useTranslation('listing');
    const number = new Intl.NumberFormat(i18n.language);
    return (
        <div className="relative max-h-80 overflow-auto rounded-md border border-divider">
            <Table size="small" stickyHeader>
                <caption className="sr-only">{t('insights.table.caption')}</caption>
                <TableHead>
                    <TableRow>
                        <TableCell scope="col">{t('insights.table.day')}</TableCell>
                        <TableCell scope="col" align="right">
                            {t('insights.views')}
                        </TableCell>
                        <TableCell scope="col" align="right">
                            {t('insights.saves')}
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {[...points].reverse().map((point) => (
                        <TableRow key={point.day}>
                            <TableCell component="th" scope="row">
                                {formatDay(point.day, i18n.language)}
                            </TableCell>
                            <TableCell align="right" className="app-tabular">
                                {number.format(point.views)}
                            </TableCell>
                            <TableCell align="right" className="app-tabular">
                                {number.format(point.saves)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
