import type { UpdateAssetInput } from '@asset-tracker/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { assetSaved } from '@/lib/asset-cache'
import { updateAsset } from '@/lib/assets-api'

type UpdateAssetVariables = {
  id: string
  input: UpdateAssetInput
}

export function useUpdateAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: UpdateAssetVariables) => updateAsset(id, input),
    onSuccess: (asset) => assetSaved(queryClient, asset),
  })
}
