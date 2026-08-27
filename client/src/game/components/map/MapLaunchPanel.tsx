import {
	BookOpen,
	ChevronDown,
	ChevronUp,
	GitBranch,
	Map,
	ArrowUpRight,
	Shield,
	Sparkles,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AtlasFaction } from './adapter';
import type { MapRealmId, MapRealmLegend } from './types';
import { REALM_ART_URLS, REALM_SYMBOLS } from './realmVisuals';

interface MapLaunchPanelProps {
	factions: readonly AtlasFaction[];
	selectedFaction: AtlasFaction;
	selectedFactionHomeRealm: MapRealmLegend;
	selectedFactionId: string;
	realms: readonly MapRealmLegend[];
	selectedRealm: MapRealmLegend;
	selectedRealmId: MapRealmId;
	zoom: number;
	onSelectFaction: (id: string) => void;
	onSelectRealm: (id: MapRealmId) => void;
	onOpenRealmCards: () => void;
	areHousesVisible: boolean;
	onToggleHouses: () => void;
}

export default function MapLaunchPanel({
	factions,
	selectedFaction,
	selectedFactionHomeRealm,
	selectedFactionId,
	realms,
	selectedRealm,
	selectedRealmId,
	zoom,
	onSelectFaction,
	onSelectRealm,
	onOpenRealmCards,
	areHousesVisible,
	onToggleHouses,
}: MapLaunchPanelProps) {
	const totalLinks = Math.round(realms.reduce((total, realm) => total + realm.connections.length, 0) / 2);

	return (
		<aside className="atlas-launch-panel min-h-0 overflow-hidden rounded-xl border border-gold-300/25 bg-obsidian-950/88 text-ink-0 shadow-[0_28px_90px_-55px_rgba(0,0,0,0.95)] backdrop-blur-md">
			<div className="atlas-launch-panel-scroll grid h-full content-start gap-3 overflow-y-auto p-3 [scrollbar-width:thin]">
				<section className="relative min-h-[12.5rem] overflow-hidden rounded-lg border border-gold-300/30 bg-obsidian-900/80 p-3">
					{REALM_ART_URLS[selectedRealm.id] ? (
						<img
							src={REALM_ART_URLS[selectedRealm.id]}
							alt={`${selectedRealm.name} environment`}
							width={640}
							height={360}
							loading="eager"
							className="absolute inset-0 h-full w-full object-cover opacity-35"
						/>
					) : null}
					<div className="absolute inset-0 bg-gradient-to-br from-obsidian-950/55 via-obsidian-950/75 to-obsidian-950" aria-hidden="true" />
					<div className="relative">
						<div className="flex items-start justify-between gap-3">
							<div>
								<p className="font-mono text-[9px] font-semibold uppercase tracking-[0.28em] text-gold-300">Atlas / field guide</p>
								<h2 className="mt-1 font-display text-lg font-black uppercase leading-tight tracking-[0.12em] text-ink-0">
									Yggdrasil Atlas
								</h2>
							</div>
							<div className="grid h-10 w-10 place-items-center rounded-md border border-gold-300/35 bg-gold-300/10 text-gold-200">
								<Map className="h-4 w-4" aria-hidden="true" />
							</div>
						</div>

						<div className="mt-3 flex items-center gap-2 rounded-md border border-white/10 bg-obsidian-950/55 p-2">
							<span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border" style={{ borderColor: `${selectedRealm.color}99`, color: selectedRealm.color }}>
								{(() => {
									const RealmIcon = REALM_SYMBOLS[selectedRealm.id];
									return <RealmIcon className="h-4 w-4" aria-hidden="true" />;
								})()}
							</span>
							<span className="min-w-0">
								<span className="block font-mono text-[8px] uppercase tracking-[0.18em] text-ink-400">Current territory</span>
								<strong className="mt-0.5 block truncate font-display text-sm font-black uppercase tracking-[0.1em] text-ink-0">{selectedRealm.name}</strong>
							</span>
						</div>
					</div>

					<div className="relative mt-3 grid grid-cols-3 gap-2">
						<LaunchMetric value={realms.length} label="Realms" />
						<LaunchMetric value={totalLinks} label="Links" />
						<LaunchMetric value={`${zoom.toFixed(1)}x`} label="Zoom" />
					</div>
				</section>

				<nav className="rounded-lg border border-obsidian-700/80 bg-obsidian-900/58 p-2" aria-label="Yggdrasil realms">
					<div className="mb-2 flex items-center justify-between gap-2 px-1">
						<p className="font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-ink-300">Realms</p>
						<span className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-400">Gate cost</span>
					</div>
					<div className="grid gap-2">
						{realms.map(realm => {
							const active = realm.id === selectedRealmId;

							return (
								<button
									key={realm.id}
									type="button"
									aria-pressed={active}
									onClick={() => onSelectRealm(realm.id)}
									className="grid min-h-14 grid-cols-[2rem_1fr_auto] items-center gap-2 rounded-md border border-obsidian-700 bg-obsidian-950/50 p-2 text-left text-ink-200 transition-colors motion-reduce:transition-none hover:border-obsidian-500 hover:bg-obsidian-850/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
									style={active ? { borderColor: 'rgba(246,196,83,0.65)', backgroundColor: 'rgba(27,39,45,0.96)', color: '#f8f3e7' } : undefined}
								>
									<span
										className="relative grid h-9 w-9 place-items-center rounded-full border"
										style={{
											borderColor: `${realm.color}77`,
											color: realm.color,
											boxShadow: active ? `0 0 18px ${realm.glow}` : 'none',
										}}
										aria-hidden="true"
									>
											{(() => {
												const RealmIcon = REALM_SYMBOLS[realm.id];
												return <RealmIcon className="h-4 w-4" aria-hidden="true" />;
											})()}
											<span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-sm border border-current/50 bg-obsidian-950 font-mono text-[8px] font-bold" aria-hidden="true">{realm.runeSymbol}</span>
										</span>
									<span className="min-w-0">
										<span className="block truncate font-display text-[12px] font-black uppercase leading-tight tracking-[0.1em]">
											{realm.name}
										</span>
										<span className="mt-1 block truncate font-mono text-[9px] uppercase tracking-[0.16em]" style={{ color: realm.color }}>
											{realm.environmentEffect}
										</span>
									</span>
									<span className="grid h-7 w-7 place-items-center rounded-full border border-obsidian-600 font-display text-xs font-black text-ink-100">
										{realm.realmShift.cost}
									</span>
								</button>
							);
						})}
					</div>
				</nav>

				<section
					className="rounded-lg border bg-obsidian-900/58 p-3"
					style={{
						borderColor: `${selectedRealm.color}66`,
						boxShadow: `inset 0 1px 0 ${selectedRealm.color}22`,
					}}
				>
					<p className="font-mono text-[9px] font-semibold uppercase tracking-[0.24em]" style={{ color: selectedRealm.color }}>
						Campaign theory
					</p>
					<div className="mt-1 flex items-center gap-2">
						{(() => {
							const RealmIcon = REALM_SYMBOLS[selectedRealm.id];
							return <RealmIcon className="h-5 w-5 shrink-0" style={{ color: selectedRealm.color }} aria-hidden="true" />;
						})()}
						<h2 className="font-display text-xl font-black uppercase leading-tight tracking-[0.1em] text-ink-0">
						{selectedRealm.name}
						</h2>
					</div>
					<p className="mt-2 text-xs leading-5 text-ink-200">{selectedRealm.description}</p>

					<div className="mt-3 grid gap-2">
						<RealmDetail icon={BookOpen} label="Saga role" value={selectedRealm.campaignArc} color={selectedRealm.color} />
						<RealmDetail icon={Shield} label={selectedRealm.realmShift.cardName} value={selectedRealm.realmShift.effect} color={selectedRealm.color} />
					</div>
					<button
						type="button"
						onClick={onOpenRealmCards}
						className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-gold-300/55 bg-gold-300/12 px-3 py-2 font-display text-[10px] font-black uppercase tracking-[0.15em] text-gold-100 transition-colors motion-reduce:transition-none hover:border-gold-200 hover:bg-gold-300/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
					>
						Open regional cards
						<ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
					</button>
				</section>

				<section className="rounded-lg border border-obsidian-700/80 bg-obsidian-900/58 p-3">
					<SectionHeader icon={GitBranch} kicker="World Tree" title="Linked realms" />
					<ul className="mt-3 grid gap-2">
						{selectedRealm.connections.map(connectionId => {
							const linkedRealm = realms.find(realm => realm.id === connectionId);
							if (!linkedRealm) return null;

							return (
								<li key={linkedRealm.id} className="grid grid-cols-[2rem_1fr] gap-2 rounded-md border border-obsidian-700 bg-obsidian-950/54 p-2">
								<span
									className="relative grid h-9 w-9 place-items-center rounded-full border"
										style={{ borderColor: `${linkedRealm.color}77`, color: linkedRealm.color }}
								>
									{(() => {
										const RealmIcon = REALM_SYMBOLS[linkedRealm.id];
										return <RealmIcon className="h-4 w-4" aria-hidden="true" />;
									})()}
									<span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-sm border border-current/50 bg-obsidian-950 font-mono text-[8px] font-bold" aria-hidden="true">{linkedRealm.runeSymbol}</span>
								</span>
									<span className="min-w-0">
										<span className="block truncate font-display text-[12px] font-black uppercase leading-tight tracking-[0.08em] text-ink-0">
											{linkedRealm.name}
										</span>
										<span className="mt-1 block truncate font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: linkedRealm.color }}>
											{linkedRealm.environmentDescription}
										</span>
									</span>
								</li>
							);
						})}
					</ul>
				</section>

				<section className="rounded-lg border border-obsidian-700/80 bg-obsidian-900/58 p-3">
					<div className="flex items-start justify-between gap-2">
						<SectionHeader icon={Sparkles} kicker="PvP identity" title="Pledged houses" />
						<button
							type="button"
							aria-expanded={areHousesVisible}
							onClick={onToggleHouses}
							className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md border border-obsidian-600 bg-obsidian-950/60 px-2 font-mono text-[8px] font-semibold uppercase tracking-[0.13em] text-ink-300 transition-colors motion-reduce:transition-none hover:border-gold-300/45 hover:text-gold-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
						>
							{areHousesVisible ? 'Hide' : `Show ${factions.length}`}
							{areHousesVisible ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> : <ChevronDown className="h-3 w-3" aria-hidden="true" />}
						</button>
					</div>
					<p className="mt-3 text-xs leading-5 text-ink-200">
						House pledges define identity and color profiles. They never change deckbuilding, match rules, or realm access.
					</p>

					<article className="mt-3 rounded-md border bg-obsidian-950/54 p-2.5" style={{ borderColor: `${selectedFaction.color}66` }}>
						<p className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em]" style={{ color: selectedFaction.color }}>Selected pledge</p>
						<h3 className="mt-1 font-display text-[13px] font-black uppercase leading-tight tracking-[0.1em] text-ink-0">{selectedFaction.name}</h3>
						<p className="mt-2 text-[11px] leading-4 text-ink-200">{selectedFaction.description}</p>
						<p className="mt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-400">Home realm / {selectedFactionHomeRealm.name}</p>
					</article>

					{areHousesVisible ? <ul className="mt-3 grid gap-2">
						{factions.map(faction => {
							const active = faction.id === selectedFactionId;

							return (
								<li key={faction.id}>
									<button
										type="button"
										aria-pressed={active}
										onClick={() => onSelectFaction(faction.id)}
										className="grid w-full grid-cols-[0.75rem_1fr] items-center gap-2 rounded-md border border-obsidian-700 bg-obsidian-950/54 p-2 text-left text-ink-200 transition-colors motion-reduce:transition-none hover:border-obsidian-500 hover:bg-obsidian-850/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold-300"
										style={active ? { borderColor: 'rgba(246,196,83,0.65)', backgroundColor: 'rgba(27,39,45,0.96)', color: '#f8f3e7' } : undefined}
									>
										<span
											className="h-3 w-3 rotate-45"
											style={{ background: faction.color, boxShadow: active ? `0 0 16px ${faction.color}` : `0 0 14px ${faction.color}66` }}
											aria-hidden="true"
										/>
										<span className="min-w-0">
											<span className="block truncate font-display text-[12px] font-black uppercase leading-tight tracking-[0.08em] text-ink-0">
												{faction.name}
											</span>
											<span className="mt-1 block truncate font-mono text-[9px] uppercase tracking-[0.18em]" style={{ color: faction.color }}>
												{faction.tagline}
											</span>
										</span>
									</button>
								</li>
							);
						})}
					</ul> : null}
				</section>
			</div>
		</aside>
	);
}

function LaunchMetric({ value, label }: { value: number | string; label: string }) {
	return (
		<div className="rounded-md border border-obsidian-700 bg-obsidian-950/54 px-2 py-2 text-center">
			<p className="font-display text-lg font-black leading-none text-ink-0">{value}</p>
			<p className="mt-1 truncate font-mono text-[8px] uppercase tracking-[0.16em] text-ink-400">{label}</p>
		</div>
	);
}

function RealmDetail({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string; color: string }) {
	return (
		<article className="grid grid-cols-[2rem_1fr] gap-2 rounded-md border border-obsidian-700 bg-obsidian-950/54 p-2.5">
			<span className="grid h-8 w-8 place-items-center rounded-md border" style={{ borderColor: `${color}77`, color }}>
				<Icon className="h-3.5 w-3.5" aria-hidden="true" />
			</span>
			<span className="min-w-0">
				<span className="block font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-ink-300">{label}</span>
				<span className="mt-1 block text-[11px] leading-4 text-ink-100">{value}</span>
			</span>
		</article>
	);
}

function SectionHeader({ icon: Icon, kicker, title }: { icon: LucideIcon; kicker: string; title: string }) {
	return (
		<div className="flex items-center justify-between gap-3">
			<div className="min-w-0">
				<p className="font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-ink-300">{kicker}</p>
				<h2 className="mt-1 truncate font-display text-sm font-black uppercase tracking-[0.12em] text-ink-0">{title}</h2>
			</div>
			<div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-gold-300/25 bg-gold-300/10 text-gold-200">
				<Icon className="h-4 w-4" aria-hidden="true" />
			</div>
		</div>
	);
}
