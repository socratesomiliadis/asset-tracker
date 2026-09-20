import { useMutation, useQueryClient } from '@tanstack/react-query'
import { assetDeleted } from '@/lib/asset-cache'
import { deleteAsset } from '@/lib/assets-api'

export function useDeleteAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteAsset,
    onSuccess: (_, id) => assetDeleted(queryClient, id),
  })
}
