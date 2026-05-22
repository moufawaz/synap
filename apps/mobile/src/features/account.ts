import { apiFetch } from '@/lib/api'

export async function deleteAccount() {
  await apiFetch<{ success: boolean }>('/api/delete-account', {
    method: 'DELETE',
  })
}
