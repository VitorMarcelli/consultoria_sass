import { redirect } from 'next/navigation';
import React from 'react';

export default function EscritorioIndex({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  redirect(`/escritorios/${id}/cadastro`);
}
