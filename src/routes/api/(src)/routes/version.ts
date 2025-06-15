import { Hono } from 'hono'

const app = new Hono()

type VercelDeployments = {
	deployments: [
		{
			uid: string
			name: string
			url: string
			created: number
			source:
				| 'api-trigger-git-deploy'
				| 'cli'
				| 'clone/repo'
				| 'git'
				| 'import'
				| 'import/repo'
				| 'redeploy'
				| 'v0-web'
			state:
				| 'BUILDING'
				| 'ERROR'
				| 'INITIALIZING'
				| 'QUEUED'
				| 'READY'
				| 'CANCELED'
				| 'DELETED'
			readyState:
				| 'BUILDING'
				| 'ERROR'
				| 'INITIALIZING'
				| 'QUEUED'
				| 'READY'
				| 'CANCELED'
				| 'DELETED'
			readySubstate: 'STAGED' | 'ROLLING' | 'PROMOTED'
			type: 'LAMBDAS'
			creator: any
			inspectorUrl: string
			meta: any
			target: 'production' | 'staging'
			aliasError: any
			aliasAssigned: number
			isRollbackCandidate: boolean
			createdAt: number
			buildingAt: number
			ready: number
			projectSettings: any
		},
	]
	pagination: {
		count: number
		next: number
		prev: number
	}
}

app.get('/app/latest-deployment', async (c) => {
	try {
		const url = `https://api.vercel.com/v6/deployments?projectId=${Bun.env.VERCEL_APP_PROJECT_ID}&limit=1&state=READY`
		const options = {
			method: 'GET',
			headers: { Authorization: 'Bearer ' + Bun.env.VERCEL_API_KEY },
		}

		const response = await fetch(url, options)
		if (response.status !== 200) {
			return c.json({}, 500)
		}
		const data = (await response.json()) as VercelDeployments

		if (data.deployments.length < 0) {
			return c.json({}, 500)
		}

		return c.json({ deployment_id: data.deployments[0].uid })
	} catch (error) {
		console.log(error)
		return c.json({}, 500)
	}
})

export { app as VersionRoutes }
