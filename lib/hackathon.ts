import type {InterviewConfig} from './types';
/** Keep device preferences; always launch the recordable three-question demo. */
export function hackathonConfig(config:InterviewConfig):InterviewConfig{
 return {...config,guest:config.guest.trim()||'Guest',topic:config.topic.trim()||'Unpopular opinions & hot takes',format:'three-questions',launch:'hackathon',engine:'demo'};
}
