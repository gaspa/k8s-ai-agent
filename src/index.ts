import * as dotenv from 'dotenv';
import { getAgent } from './agents/k8sAgent';
import { HumanMessage } from '@langchain/core/messages';
import { getLogger } from '@fluidware-it/saddlebag';

dotenv.config();

const logger = getLogger();
logger.info('Starting app');

async function main() {
  const namespace = process.argv[2] || 'default';

  logger.info(`--- Analisi Namespace: ${namespace} ---`);

  const input = {
    messages: [
      new HumanMessage(`Controlla lo stato del namespace "${namespace}".
      Dimmi se ci sono pod con errori o riavvii anomali.
      Dai anche un'occhiata veloce allo stato dei nodi per vedere se il cluster è sano.`)
    ]
  };

  const result = await getAgent().invoke(input);

  // L'ultimo messaggio della lista è la risposta finale dell'AI
  const lastMessage = result.messages[result.messages.length - 1];
  logger.info('\nREPORT AGENTE:');
  // eslint-disable-next-line no-console
  console.log(lastMessage?.content);
}

main().catch(logger.error);
