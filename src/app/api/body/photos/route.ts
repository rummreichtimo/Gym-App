import { prisma } from '@/server/db';
import { ok, parseBody, withUser } from '@/server/api';
import { progressPhotoSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export const GET = withUser(async (user) => {
  const photos = await prisma.progressPhoto.findMany({
    where: { userId: user.id },
    orderBy: { date: 'desc' },
  });
  return ok({
    photos: photos.map((photo) => ({
      id: photo.id,
      date: photo.date,
      imageData: photo.imageData,
      pose: photo.pose,
      note: photo.note,
    })),
  });
});

export const POST = withUser(async (user, request) => {
  const input = await parseBody(request, progressPhotoSchema);

  const photo = await prisma.progressPhoto.create({
    data: {
      userId: user.id,
      date: input.date,
      imageData: input.imageData,
      pose: input.pose,
      note: input.note,
    },
  });

  return ok({ photo }, 201);
});
