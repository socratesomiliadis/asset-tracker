import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createAsset } from '@/lib/assets-api'
import { assetSaved } from '@/lib/asset-cache'

export function useCreateAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createAsset,
    onSuccess: (asset) => assetSaved(queryClient, asset),
  })
}
