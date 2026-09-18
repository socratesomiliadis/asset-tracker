import { useMutation, useQueryClient } from '@tanstack/react-query'
import { assetQueryKeys } from '@/hooks/use-assets'
import { deleteAsset } from '@/lib/assets-api'

export function useDeleteAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteAsset,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: assetQueryKeys.all }),
  })
}
