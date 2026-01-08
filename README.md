# k8s-ai-agent

Agent to check the health of a Kubernetes application:

* install NodeJS (at least version 22.14)
* run `npm ci`
* create a `.env` file with a valid `ANTHROPIC_API_KEY` variable
* run `npm run start:dev <namespace>` with the namespace of the cluster you want to check
