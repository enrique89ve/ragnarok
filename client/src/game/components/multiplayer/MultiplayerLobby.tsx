import { useState, useEffect } from 'react';
import { usePeerStore } from '../../stores/peerStore';
import { useMatchmaking } from '../../hooks/useMatchmaking';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { Copy, Check, X, Users, Zap } from 'lucide-react';
import { toast } from 'sonner';

interface MultiplayerLobbyProps {
	onGameStart: () => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({ onGameStart }) => {
	const {
		myPeerId,
		remotePeerId,
		connectionState,
		isHost,
		error,
		host,
		join,
		disconnect,
		setRemotePeerId,
	} = usePeerStore();

	const {
		status: matchmakingStatus,
		queuePosition,
		opponentPeerId,
		isHost: matchmakingIsHost,
		error: matchmakingError,
		joinQueue,
		leaveQueue,
	} = useMatchmaking();

	const [joinId, setJoinId] = useState('');
	const [copied, setCopied] = useState(false);
	const [mode, setMode] = useState<'manual' | 'quick'>('manual');

	useEffect(() => {
		if (connectionState === 'connected' && myPeerId) {
			onGameStart();
		}
	}, [connectionState, myPeerId, onGameStart]);

	useEffect(() => {
		if (matchmakingStatus === 'matched' && opponentPeerId && myPeerId) {
			const connectToOpponent = async () => {
				try {
					if (!matchmakingIsHost) {
						// Client connects to the host's already-running peer
						await join(opponentPeerId);
					}
					// Host already has a running peer - the opponent will connect to us
					leaveQueue();
				} catch (err) {
					toast.error('Failed to connect to opponent');
					leaveQueue();
				}
			};
			connectToOpponent();
		}
	}, [matchmakingStatus, opponentPeerId, matchmakingIsHost, myPeerId, join, leaveQueue]);

	const handleHost = async () => {
		try {
			await host();
			toast.success('Game created! Share your ID with your opponent.');
		} catch (err) {
			toast.error('Failed to create game. Please try again.');
		}
	};

	const handleJoin = async () => {
		if (!joinId.trim()) {
			toast.error('Please enter a game ID');
			return;
		}
		try {
			await join(joinId.trim());
			toast.success('Connecting to game...');
		} catch (err) {
			toast.error('Failed to join game. Check the ID and try again.');
		}
	};

	const handleCopyId = async () => {
		if (myPeerId) {
			await navigator.clipboard.writeText(myPeerId);
			setCopied(true);
			toast.success('Game ID copied to clipboard!');
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const handleDisconnect = () => {
		disconnect();
		leaveQueue();
		setJoinId('');
		setRemotePeerId(null);
		setMode('manual');
		toast.info('Disconnected from game');
	};

	const handleQuickMatch = async () => {
		setMode('quick');
		if (!myPeerId) {
			try {
				await host();
			} catch (err) {
				toast.error('Failed to initialize. Please try again.');
				return;
			}
		}
		await joinQueue();
	};

	return (
		<div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Users className="w-5 h-5" />
						P2P Multiplayer
					</CardTitle>
					<CardDescription>
						Host a game or join with a friend's ID. All gameplay is peer-to-peer.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{connectionState === 'disconnected' && matchmakingStatus === 'idle' && (
						<div className="space-y-4">
							<Button onClick={handleQuickMatch} className="w-full" size="lg">
								<Zap className="w-4 h-4 mr-2" />
								Quick Match
							</Button>
							<div className="relative">
								<div className="absolute inset-0 flex items-center">
									<span className="w-full border-t" />
								</div>
								<div className="relative flex justify-center text-xs uppercase">
									<span className="bg-background px-2 text-muted-foreground">Or</span>
								</div>
							</div>
							<Button onClick={handleHost} className="w-full" variant="outline">
								Host Game
							</Button>
							<div className="space-y-2">
								<Input
									placeholder="Enter Game ID"
									value={joinId}
									onChange={(e) => setJoinId(e.target.value)}
									onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
								/>
								<Button onClick={handleJoin} className="w-full" variant="outline">
									Join Game
								</Button>
							</div>
						</div>
					)}

					{matchmakingStatus === 'queued' && (
						<div className="text-center space-y-4">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
							<p className="text-sm text-muted-foreground">Searching for opponent...</p>
							{queuePosition !== null && (
								<p className="text-xs text-muted-foreground">
									Position in queue: {queuePosition}
								</p>
							)}
							<Button onClick={leaveQueue} variant="outline" className="w-full">
								Cancel Search
							</Button>
						</div>
					)}

					{matchmakingStatus === 'matched' && connectionState !== 'connected' && (
						<div className="text-center space-y-2">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
							<p className="text-sm text-muted-foreground">Connecting to opponent...</p>
						</div>
					)}

					{matchmakingError && (
						<div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
							<p className="text-sm text-destructive">{matchmakingError}</p>
							<div className="flex gap-2 mt-2">
								<Button onClick={leaveQueue} variant="outline" className="flex-1">
									Try Again
								</Button>
								<Button
									onClick={() => {
										leaveQueue();
										setMode('manual');
									}}
									variant="outline"
									className="flex-1"
								>
									Use Manual Match
								</Button>
							</div>
						</div>
					)}

					{connectionState === 'connecting' && (
						<div className="text-center space-y-2">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
							<p className="text-sm text-muted-foreground">
								{isHost ? 'Creating game...' : 'Connecting...'}
							</p>
						</div>
					)}


					{connectionState === 'waiting' && myPeerId && (
						<div className="space-y-4">
							<div className="p-4 bg-muted rounded-lg">
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm font-medium">Your Game ID:</span>
									<Button
										variant="ghost"
										size="sm"
										onClick={handleCopyId}
										className="h-8 w-8 p-0"
									>
										{copied ? (
											<Check className="w-4 h-4 text-green-500" />
										) : (
											<Copy className="w-4 h-4" />
										)}
									</Button>
								</div>
								<code className="text-xs font-mono break-all">{myPeerId}</code>
								<p className="text-xs text-muted-foreground mt-2">
									Share this ID with your opponent
								</p>
							</div>
							<div className="text-center space-y-2">
								<div className="flex justify-center gap-1">
									<div className="animate-bounce h-2 w-2 rounded-full bg-primary" style={{ animationDelay: '0ms' }} />
									<div className="animate-bounce h-2 w-2 rounded-full bg-primary" style={{ animationDelay: '150ms' }} />
									<div className="animate-bounce h-2 w-2 rounded-full bg-primary" style={{ animationDelay: '300ms' }} />
								</div>
								<p className="text-sm text-muted-foreground">Waiting for opponent to join...</p>
							</div>
							<Button onClick={handleDisconnect} variant="destructive" className="w-full">
								<X className="w-4 h-4 mr-2" />
								Cancel
							</Button>
						</div>
					)}

					{connectionState === 'connected' && myPeerId && (
						<div className="space-y-4">
							<div className="p-4 bg-muted rounded-lg">
								<div className="flex items-center justify-between mb-2">
									<span className="text-sm font-medium">Your Game ID:</span>
									<Button
										variant="ghost"
										size="sm"
										onClick={handleCopyId}
										className="h-8 w-8 p-0"
									>
										{copied ? (
											<Check className="w-4 h-4 text-green-500" />
										) : (
											<Copy className="w-4 h-4" />
										)}
									</Button>
								</div>
								<code className="text-xs font-mono break-all">{myPeerId}</code>
								{isHost && (
									<p className="text-xs text-muted-foreground mt-2">
										Share this ID with your opponent to let them join
									</p>
								)}
							</div>
							{isHost && connectionState === 'connected' && !remotePeerId && (
								<p className="text-sm text-muted-foreground text-center">
									Waiting for opponent to join...
								</p>
							)}
							{remotePeerId && (
								<div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
									<p className="text-sm text-green-600 dark:text-green-400">
										✓ Connected to opponent
									</p>
								</div>
							)}
							<Button onClick={handleDisconnect} variant="destructive" className="w-full">
								<X className="w-4 h-4 mr-2" />
								Disconnect
							</Button>
						</div>
					)}

					{connectionState === 'error' && error && (
						<div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
							<p className="text-sm text-destructive">{error}</p>
							<Button onClick={handleDisconnect} variant="outline" className="w-full mt-2">
								Try Again
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
};
