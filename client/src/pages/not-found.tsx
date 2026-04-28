import { AlertCircle } from 'lucide-react';
import { Panel, PanelContent } from '@/components/ui-norse';

export default function NotFound() {
	return (
		<div className="min-h-screen w-full flex items-center justify-center bg-[var(--obsidian-950)]">
			<Panel className="w-full max-w-md mx-4">
				<PanelContent className="pt-6">
					<div className="flex mb-4 gap-2">
						<AlertCircle className="h-8 w-8 text-[var(--blood-300)]" />
						<h1 className="text-2xl font-bold text-[var(--ink-0)]">404 Page Not Found</h1>
					</div>

					<p className="mt-4 text-sm text-[var(--ink-200)]">
						Did you forget to add the page to the router?
					</p>
				</PanelContent>
			</Panel>
		</div>
	);
}
