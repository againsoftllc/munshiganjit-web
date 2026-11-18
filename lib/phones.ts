/* My Gadget Setup: the page's view of the plugin data (lib/gadget.ts holds the matching engine).
   Gadget Type → Brand → Model → Compatibility Check. The types, their columns, the devices, the groups and
   the matching rules all come from the AgainERP plugin (admin → Workspace → Plugins → My Gadget Setup);
   nothing about a particular gadget type is written here. */
import { gadgetData, onDataApplied, type Product } from './data';
import { emptyNoteOf, gbText, isBestMatch as groupMatches, noteOf, reportOf as reportRows, type Device, type GGroup, type GType } from './gadget';

export type { Device, GGroup, GType };
export { gbText, noteOf, emptyNoteOf };

/** [name, icon] of every gadget type, in the admin's order */
export const DEVICE_TYPES: [string, string][] = [];
export const devices: Device[] = [];
export const typeOf = (name: string): GType | undefined => gadgetData.types.find(t => t.name === name);
export const brandsOf = (t: string) => [...new Set(devices.filter(d => d.type === t).map(d => d.brand))];
export const modelsOf = (t: string, brand: string) => devices.filter(d => d.type === t && d.brand === brand);

/* gadget groups under "Choose Your Gadgets From Here", per device type — products of `cat` (and `sub`, if set).
   showAll: the right-hand side lists every product of the group (all memory cards on the right) */
export interface SetupGroup extends GGroup { pick: (p: Product) => boolean }
export const SETUP_GROUPS: Record<string, SetupGroup[]> = {};

/* refilled every time new plugin data is applied (build data, or the live data of a request) */
onDataApplied(() => {
  DEVICE_TYPES.splice(0, DEVICE_TYPES.length, ...gadgetData.types.map(t => [t.name, t.icon] as [string, string]));
  const known = new Set(DEVICE_TYPES.map(([n]) => n));
  devices.splice(0, devices.length, ...gadgetData.devices.filter(d => d && known.has(d.type) && d.brand && d.model));
  for (const k of Object.keys(SETUP_GROUPS)) delete SETUP_GROUPS[k];
  for (const t of gadgetData.types) {
    SETUP_GROUPS[t.name] = t.groups.filter(g => g.enabled !== false).map(g => ({ ...g, pick: (p: Product) => p.cat === g.cat && (!g.sub || p.sub === g.sub) }));
  }
});

/** Best Matching = the group's rules hold for this product and device; the rest of the group is "You Can Also Buy" */
export const isBestMatch = (p: Product, group: GGroup, d: Device) => groupMatches(group, p, d);
/** the "Your Report" rows */
export const reportOf = (d: Device): [string, string][] => {
  const t = typeOf(d.type);
  return t ? reportRows(t, d) : [];
};
