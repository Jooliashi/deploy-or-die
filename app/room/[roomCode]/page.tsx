import { RoomClient } from '@/components/room-client';

interface RoomPageProps {
  params: Promise<{ roomCode: string }>;
  searchParams: Promise<{ name?: string; host?: string }>;
}

export default async function RoomPage({
  params,
  searchParams,
}: RoomPageProps) {
  const { roomCode } = await params;
  const { name, host } = await searchParams;

  return (
    <RoomClient
      roomCode={roomCode}
      playerName={name ?? 'Alex'}
      isHost={host === '1'}
    />
  );
}

