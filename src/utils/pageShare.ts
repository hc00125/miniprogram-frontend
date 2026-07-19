import { onShareAppMessage, onShareTimeline } from '@dcloudio/uni-app'

export interface PageShareConfig {
  title: string
  path: string
  imageUrl?: string
  timelineQuery?: string
}

function compactShareResult(config: PageShareConfig) {
  return {
    title: config.title,
    path: config.path,
    ...(config.imageUrl ? { imageUrl: config.imageUrl } : {})
  }
}

export function usePageShare(resolveConfig: () => PageShareConfig) {
  onShareAppMessage(() => compactShareResult(resolveConfig()))

  onShareTimeline(() => {
    const config = resolveConfig()
    const query = config.timelineQuery ?? config.path.split('?')[1] ?? ''
    return {
      title: config.title,
      query,
      ...(config.imageUrl ? { imageUrl: config.imageUrl } : {})
    }
  })
}
