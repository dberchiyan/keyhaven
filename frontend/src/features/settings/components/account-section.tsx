import EditOutlined from '@mui/icons-material/EditOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { type ReactElement, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAccess, useCurrentUser } from '@/features/auth';
import { InitialsAvatar } from '@/shared/components/initials-avatar';

import { ChangePasswordForm } from './change-password-form';
import { EditNameDialog } from './edit-name-dialog';
import { EmailVerificationStatus } from './email-verification-status';
import { PersonalDataCard } from './personal-data-card';
import { SettingsCard } from './settings-card';

/** Who you are (name editable in a dialog; email and whether it is verified), your password and your data. */
export function AccountSection(): ReactElement {
    const { t } = useTranslation(['settings', 'shell']);
    const user = useCurrentUser().data;
    const can = useAccess();
    const [editOpening, setEditOpening] = useState(0);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const editButtonRef = useRef<HTMLButtonElement>(null);
    return (
        <div className="flex flex-col gap-4">
            <SettingsCard
                id="settings-profile"
                title={t('account.profile.title')}
                description={t('account.profile.description')}
            >
                {user && (
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-4">
                            <InitialsAvatar
                                id={user.id}
                                firstName={user.firstName}
                                lastName={user.lastName}
                                size="lg"
                            />
                            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
                                <Typography component="dt" variant="body2" color="textSecondary">
                                    {t('account.profile.name')}
                                </Typography>
                                <Typography component="dd" variant="body2" className="m-0">
                                    {`${user.firstName} ${user.lastName}`}
                                </Typography>
                                <Typography component="dt" variant="body2" color="textSecondary">
                                    {t('account.profile.email')}
                                </Typography>
                                <Typography component="dd" variant="body2" className="m-0 [overflow-wrap:anywhere]">
                                    {user.email}
                                </Typography>
                                <Typography component="dt" variant="body2" color="textSecondary">
                                    {t('account.profile.role')}
                                </Typography>
                                <Typography component="dd" variant="body2" className="m-0">
                                    {t(`shell:role.${user.role}`)}
                                </Typography>
                                {user.agency && (
                                    <>
                                        <Typography component="dt" variant="body2" color="textSecondary">
                                            {t('account.profile.agency')}
                                        </Typography>
                                        <Typography component="dd" variant="body2" className="m-0">
                                            {user.agency.name}
                                        </Typography>
                                    </>
                                )}
                            </dl>
                            <Button
                                ref={editButtonRef}
                                variant="outlined"
                                startIcon={<EditOutlined aria-hidden />}
                                className="sm:ml-auto sm:self-start"
                                onClick={() => {
                                    setEditOpening((opening) => opening + 1);
                                    setIsEditOpen(true);
                                }}
                            >
                                {t('account.profile.edit')}
                            </Button>
                        </div>
                        <EmailVerificationStatus user={user} />
                    </div>
                )}
                {user && editOpening > 0 && (
                    <EditNameDialog
                        key={editOpening}
                        open={isEditOpen}
                        user={user}
                        onClose={() => {
                            setIsEditOpen(false);
                        }}
                        onExited={() => {
                            editButtonRef.current?.focus();
                        }}
                    />
                )}
            </SettingsCard>
            <SettingsCard
                id="settings-password"
                title={t('account.password.title')}
                description={t('account.password.description')}
            >
                {can('account.changePassword') ? (
                    <div className="@container">
                        <ChangePasswordForm />
                    </div>
                ) : (
                    <Alert severity="info">{t('demo.passwordOff')}</Alert>
                )}
            </SettingsCard>
            <PersonalDataCard />
        </div>
    );
}
