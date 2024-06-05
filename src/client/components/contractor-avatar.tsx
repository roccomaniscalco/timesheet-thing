import { profileQueryOptions } from '@/client/api-caller'
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@/client/components/ui/avatar'
import { Skeleton } from '@/client/components/ui/skeleton'
import { ExclamationTriangleIcon } from '@heroicons/react/16/solid'
import { useQuery } from '@tanstack/react-query'

type ContractorAvatarProps = {
  id?: string | null
  className?: string
}
export function ContractorAvatar(props: ContractorAvatarProps) {
  const profileQuery = useQuery({
    ...profileQueryOptions(props.id),
    select: (profile) => {
      if (!profile.imageUrl) {
        return profile
      }
      const params = new URLSearchParams()
      params.set('width', '160')
      return {
        ...profile,
        imageUrl: `${profile.imageUrl}?${params.toString()}`
      }
    }
  })

  if (profileQuery.isPending) {
    return (
      <Avatar className={props.className}>
        <Skeleton className={'h-full w-full'} />
      </Avatar>
    )
  }

  if (profileQuery.isError) {
    return (
      <Avatar className={props.className}>
        <AvatarFallback className="bg-destructive">
          <ExclamationTriangleIcon className="h-4 w-4 text-destructive-foreground" />
        </AvatarFallback>
      </Avatar>
    )
  }

  return (
    <Avatar className={props.className}>
      <AvatarImage src={profileQuery.data.imageUrl} />
      <AvatarFallback>
        {profileQuery.data.firstName?.[0]}
        {profileQuery.data.lastName?.[0]}
      </AvatarFallback>
    </Avatar>
  )
}
