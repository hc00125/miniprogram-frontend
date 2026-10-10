export const NATIONAL_BOUNTY_TITLE = '国庆冲榜活动'
export const NATIONAL_BOUNTY_STATUS = '已结束'
export const NATIONAL_BOUNTY_REWARD_NOTICE = '最终排名已锁定，活动奖励已全部发放。'

export const NATIONAL_BOUNTY_RESULTS = [
  { rank: 1, name: '朝宗', score: '72727107' },
  { rank: 2, name: '女一大', score: '70175285' },
  { rank: 3, name: '咖啡', score: '69473325' }
] as const

export function formatNationalBountyScore(score: string): string {
  return score.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}
