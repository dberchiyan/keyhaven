import DeleteForeverOutlined from '@mui/icons-material/DeleteForeverOutlined';
import DownloadOutlined from '@mui/icons-material/DownloadOutlined';
import Button from '@mui/material/Button';
import FormHelperText from '@mui/material/FormHelperText';
import Typography from '@mui/material/Typography';
import { type ReactElement, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAccess, useCurrentUser, useDownloadPersonalData } from '@/features/auth';
import { RESERVED_LINE } from '@/shared/hooks/use-field-message';

import { EraseAccountDialog } from './erase-account-dialog';
import { SettingsCard } from './settings-card';

/**
 * DATA-23: a copy of one's data, and erasing the account. Staff accounts are removed by another
 * admin, so admins do not see the second action; the demo's shared accounts see it turned off with
 * the reason (the API refuses them anyway — FSEC-8).
 */
export function PersonalDataCard(): ReactElement {
    const { t } = useTranslation(['settings', 'errors']);
    const { canAccess } = useAccess();
    const isDemoRestricted = useCurrentUser().data?.isDemoRestricted ?? false;
    const download = useDownloadPersonalData();
    const [eraseOpening, setEraseOpening] = useState(0);
    const [isEraseOpen, setIsEraseOpen] = useState(false);
    const eraseButtonRef = useRef<HTMLButtonElement>(null);

    return (
        <SettingsCard id="settings-data" title={t('data.title')} description={t('data.description')}>
            <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-2">
                    <Typography variant="body2" color="textSecondary">
                        {t('data.download.hint')}
                    </Typography>
                    <div>
                        <Button
                            variant="outlined"
                            startIcon={<DownloadOutlined aria-hidden />}
                            loading={download.isPending}
                            loadingPosition="start"
                            onClick={() => {
                                download.mutate();
                            }}
                        >
                            {download.isPending ? t('data.download.pending') : t('data.download.action')}
                        </Button>
                    </div>
                    <FormHelperText component="div" role="alert" error className="m-0">
                        {download.error ? t(`errors:${download.error.code}`) : RESERVED_LINE}
                    </FormHelperText>
                </div>
                {canAccess('account.erase') && (
                    <div className="flex flex-col gap-2 border-t border-divider pt-6">
                        <Typography variant="subtitle2" component="h3">
                            {t('data.erase.heading')}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            {t('data.erase.hint')}
                        </Typography>
                        <div>
                            <Button
                                ref={eraseButtonRef}
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteForeverOutlined aria-hidden />}
                                disabled={isDemoRestricted}
                                onClick={() => {
                                    setEraseOpening((opening) => opening + 1);
                                    setIsEraseOpen(true);
                                }}
                            >
                                {t('data.erase.action')}
                            </Button>
                        </div>
                        {isDemoRestricted && (
                            <Typography variant="body2" color="textSecondary">
                                {t('demo.eraseOff')}
                            </Typography>
                        )}
                    </div>
                )}
            </div>
            {eraseOpening > 0 && (
                <EraseAccountDialog
                    key={eraseOpening}
                    open={isEraseOpen}
                    onClose={() => {
                        setIsEraseOpen(false);
                    }}
                    onExited={() => {
                        eraseButtonRef.current?.focus();
                    }}
                />
            )}
        </SettingsCard>
    );
}
