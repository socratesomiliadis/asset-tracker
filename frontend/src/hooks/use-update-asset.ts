import type { UpdateAssetInput } from '@asset-tracker/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { assetQueryKeys } from '@/hooks/use-assets'
import { updateAsset } from '@/lib/assets-api'

type UpdateAssetVariables = {
  id: string
  input: UpdateAssetInput
}

export function useUpdateAsset() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, input }: UpdateAssetVariables) => updateAsset(id, input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: assetQueryKeys.all }),
  })
}
