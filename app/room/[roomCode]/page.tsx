import { RoomClient } from '@/components/room-client';

interface RoomPageProps {
  params: Promise<{ roomCode: string }>;
  searchParams: Promise<{ name?: string }>;
}

export default async function RoomPage({
  params,
  searchParams,
}: RoomPageProps) {
  const { roomCode } = await params;
  const { name } = await searchParams;

  return (
    <main className="shell">
      <RoomClient roomCode={roomCode} playerName={name ?? 'Alex'} />
    </main>
  );
}

