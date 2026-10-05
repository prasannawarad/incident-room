import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import { generatePostmortem } from './generate-postmortem'

export const actions: Record<string, ActionHandler<Env>> = {
  generatePostmortem,
}
