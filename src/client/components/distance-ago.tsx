import { formatDistanceAgo } from "@/client/components/utils"
import { useEffect, useState } from "react"

type DistanceAgoProps = {
  date: Date
}
export function DistanceAgo(props: DistanceAgoProps) {
  const [distanceAgo, setDistanceAgo] = useState(formatDistanceAgo(props.date))

  // Update distanceAgo every second
  useEffect(() => {
    const interval = setInterval(() => {
      setDistanceAgo(formatDistanceAgo(props.date))
    }, 1000)
    return () => clearInterval(interval)
  }, [props.date])

  return <span className="tabular-nums">{distanceAgo}</span>
}