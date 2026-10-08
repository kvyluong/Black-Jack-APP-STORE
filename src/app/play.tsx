import { TableScreen } from '../components/table/TableScreen';
import { Screen } from '../components/ui';
import { useSettings } from '../state/settings';

/** The practice table. The table itself lives in components/table/TableScreen (shared with the test). */
export default function Play() {
  const { ready, settings } = useSettings();
  if (!ready) return <Screen>{null}</Screen>;
  // A fresh shoe whenever you change tables or table rules.
  return (
    <TableScreen
      key={`${settings.tableId}:${settings.countingSystem}:${JSON.stringify(settings.rules)}`}
      mode="practice"
    />
  );
}
