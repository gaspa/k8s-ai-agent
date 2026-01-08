import * as dotenv from 'dotenv';
import { getAgent } from './agents/k8sAgent';
import { HumanMessage } from '@langchain/core/messages';
import { getLogger } from '@fluidware-it/saddlebag';

dotenv.config();

const logger = getLogger();
logger.info('Starting app');

async function main() {
  const namespace = process.argv[2] || 'default';

  logger.info(`--- Namespace Analysis: ${namespace} ---`);

  const input = {
    messages: [
      new HumanMessage(`Check the status of the namespace "${namespace}".
      Tell me if there are pods with errors, abnormal restarts or other issues.
      If there are, tell me what they are and eventually how to fix them.
      For the worst issue, analyze logs (eventually the previous instance) to understand what caused it
      Also take a look at the node status to see if the cluster is healthy.`)
    ]
  };

  const result = await getAgent().invoke(input);

  // The last message in the list is the AI's final response
  const lastMessage = result.messages[result.messages.length - 1];
  logger.info('\nAGENT REPORT:');
  // eslint-disable-next-line no-console
  console.log(lastMessage?.content);
}

main().catch((e: any) => {
  // eslint-disable-next-line no-console
  console.log(e);
  logger.error(e);
});
