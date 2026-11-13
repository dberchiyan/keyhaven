import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router';
import { isApiError } from '@/shared/api/apiError';
import { RowSkeleton } from '@/shared/components/RowSkeleton';
import { browseSearch } from '@/shared/lib/listingSearch';
import { PATHS } from '@/shared/lib/paths';
import { fromCriteria } from '../criteria';
import {
  useDeleteSavedSearch,
  useSavedSearches,
  useUpdateSavedSearch,
} from '../hooks/useSavedSearchQueries';
import { FilterSummary } from './FilterSummary';

/** The tenant's saved searches: open the results, switch the daily email, delete. */
export function SavedSearchesSection() {
  const { t, i18n } = useTranslation(['savedSearch', 'errors']);
  const searches = useSavedSearches();
  const update = useUpdateSavedSearch();
  const remove = useDeleteSavedSearch();

  if (searches.isPending) {
    return (
      <div aria-busy="true">
        <RowSkeleton leading="icon" trailing={false} />
        <RowSkeleton leading="icon" trailing={false} />
      </div>
    );
  }
  if (searches.isError) {
    return (
      <Alert
        severity="error"
        role="alert"
        action={
          <Button color="inherit" size="small" onClick={() => void searches.refetch()}>
            {t('savedSearch:retry')}
          </Button>
        }
      >
        {t(`errors:${isApiError(searches.error) ? searches.error.code : 'INTERNAL_ERROR'}`)}
      </Alert>
    );
  }
  if (searches.data.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 py-6">
        <Typography variant="h6" component="p">
          {t('savedSearch:empty')}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {t('savedSearch:emptyHint')}
        </Typography>
        <Button component={RouterLink} to={PATHS.browse} variant="outlined">
          {t('savedSearch:browse')}
        </Button>
      </div>
    );
  }
  const mutationError = update.error ?? remove.error;
  return (
    <div className="flex flex-col gap-3">
      {mutationError && (
        <Alert severity="error" role="alert">
          {t(`errors:${mutationError.code}`)}
        </Alert>
      )}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {searches.data.map((search) => (
          <li key={search.id}>
            <Card variant="outlined" className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-col gap-1">
                  <Typography variant="h6" component="h3" className="truncate">
                    <RouterLink
                      to={`${PATHS.browse}?${browseSearch(fromCriteria(search.criteria))}`}
                      className="text-inherit no-underline hover:underline"
                    >
                      {search.name}
                    </RouterLink>
                  </Typography>
                  <FilterSummary filters={fromCriteria(search.criteria)} />
                  <Typography variant="caption" color="textSecondary">
                    {search.lastNotifiedAt
                      ? t('savedSearch:lastSent', {
                          date: new Intl.DateTimeFormat(i18n.language, {
                            dateStyle: 'medium',
                            timeZone: 'UTC',
                          }).format(new Date(search.lastNotifiedAt)),
                        })
                      : t('savedSearch:notSentYet')}
                  </Typography>
                </div>
                <IconButton
                  aria-label={t('savedSearch:delete', { name: search.name })}
                  disabled={remove.isPending}
                  onClick={() => {
                    remove.mutate(search.id);
                  }}
                >
                  <DeleteOutlined aria-hidden />
                </IconButton>
              </div>
              <FormControlLabel
                control={
                  <Switch
                    checked={search.emailAlerts}
                    disabled={update.isPending}
                    onChange={(_event, checked) => {
                      update.mutate({
                        id: search.id,
                        request: {
                          name: search.name,
                          emailAlerts: checked,
                          version: search.version,
                        },
                      });
                    }}
                  />
                }
                label={t('savedSearch:alerts')}
              />
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
