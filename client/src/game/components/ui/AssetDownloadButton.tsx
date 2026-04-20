import { useAssetCacheStore, formatBytes } from '../../stores/assetCacheStore';
import { Button } from '../../../components/ui/button';
import { Progress } from '../../../components/ui/progress';

declare const __BUILD_HASH__: string;

export default function AssetDownloadButton() {
	const {
		isFullyDownloaded, isDownloading, downloadProgress,
		filesDownloaded, filesTotal, bytesDownloaded, bytesTotal,
		downloadError, downloadedVersion,
		startDownload, cancelDownload,
	} = useAssetCacheStore();

	const updateAvailable = isFullyDownloaded
		&& typeof __BUILD_HASH__ !== 'undefined'
		&& downloadedVersion !== __BUILD_HASH__;

	if (isDownloading) {
		return (
			<div className="w-full space-y-2">
				<div className="w-full rounded-lg px-4 py-4"
					style={{
						background: 'linear-gradient(180deg, #1a4a2a 0%, #0d3318 50%, #071f0e 100%)',
						border: '1px solid #2a7a3a',
					}}
				>
					<div className="text-sm font-semibold tracking-wide uppercase text-green-300 mb-2">
						Downloading Assets...
					</div>
					<Progress value={downloadProgress} className="h-2 mb-2" />
					<div className="flex justify-between text-xs text-green-400/70">
						<span>{filesDownloaded} / {filesTotal} files</span>
						<span>{formatBytes(bytesDownloaded)} / {formatBytes(bytesTotal)}</span>
					</div>
				</div>
				<Button
					onClick={cancelDownload}
					className="w-full py-3 text-sm font-medium tracking-wide uppercase border opacity-70 hover:opacity-100"
					style={{
						background: 'transparent',
						borderColor: '#666',
						color: '#999',
					}}
				>
					Cancel
				</Button>
			</div>
		);
	}

	if (downloadError) {
		return (
			<div className="w-full space-y-2">
				<div className="w-full rounded-lg px-4 py-3 text-center"
					style={{
						background: 'linear-gradient(180deg, #4a2a1a 0%, #331a0d 50%, #1f0e07 100%)',
						border: '1px solid #7a3a2a',
					}}
				>
					<div className="text-sm text-red-300/80">{downloadError}</div>
				</div>
				<Button
					onClick={startDownload}
					className="homepage-btn-download w-full py-5 text-lg font-bold tracking-wide uppercase border-2"
				>
					Retry Download
				</Button>
			</div>
		);
	}

	if (isFullyDownloaded && !updateAvailable) {
		return (
			<div className="w-full rounded-lg px-4 py-3 flex items-center justify-center gap-2"
				style={{
					background: 'linear-gradient(180deg, #1a3a2a 0%, #0d2818 50%, #071a0e 100%)',
					border: '1px solid #1a5a2a',
				}}
			>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
					<path d="M3 8.5L6.5 12L13 4" stroke="#60d080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
				</svg>
				<span className="text-sm font-medium tracking-wide uppercase text-green-400/70">
					Assets Installed
				</span>
			</div>
		);
	}

	return (
		<Button
			onClick={startDownload}
			className="homepage-btn-download w-full py-6 text-lg font-bold tracking-wide uppercase border-2"
		>
			{updateAvailable ? 'Update Game Assets' : 'Download Game Assets (256 MB)'}
		</Button>
	);
}
