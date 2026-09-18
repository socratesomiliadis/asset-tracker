import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createAsset } from '@/lib/assets-api'
import { assetQueryKeys } from '@/hooks/use-assets'

export function useCreateAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAsset,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: assetQueryKeys.all }),
  })
}
