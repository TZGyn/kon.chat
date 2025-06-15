import { fetch } from 'bun'

export const braveSearch = async (query: string) => {
	try {
		const response = await fetch(
			`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(
				query,
			)}&count=10`,
			{
				headers: {
					'X-Subscription-Token': Bun.env.BRAVE_API_KEY!,
					Accept: 'application/json',
				},
			},
		)

		return (await response.json()) as {
			query: {
				original: string
				show_strict_warning: boolean
				is_navigational: boolean
				is_news_breaking: boolean
				spellcheck_off: boolean
				country: string // 2 character country codes
				bad_results: boolean
				should_fallback: boolean
				postal_code: string
				city: string
				header_country: string
				more_results_available: boolean
				state: string
			}
			mixed: {
				type: 'mixed'
				main: {
					type: string // 'web'
					index: number // 0
					all: boolean
				}[]
				top: []
				side: []
			}
			type: 'search'
			videos: {
				type: 'videos'
				results: {
					type: 'video_result'
					url: string
					title: string
					description: string
					age: string
					page_age: string
					video: {}
					meta_url: {
						scheme: string // 'https'
						netloc: string // 'youtube.com'
						hostname: string // 'www.youtube.com'
						favicon: string // 'https://imgs.search.brave.com/Wg4wjE5SHAargkzePU3eSLmWgVz84BEZk1SjSglJK_U/rs:fit:32:32:1:0/g:ce/aHR0cDovL2Zhdmlj/b25zLnNlYXJjaC5i/cmF2ZS5jb20vaWNv/bnMvOTkyZTZiMWU3/YzU3Nzc5YjExYzUy/N2VhZTIxOWNlYjM5/ZGVjN2MyZDY4Nzdh/ZDYzMTYxNmI5N2Rk/Y2Q3N2FkNy93d3cu/eW91dHViZS5jb20v'
						path: string // '› watch'
					}
					thumbnail: {
						src: string // 'https://imgs.search.brave.com/kijm1LyaKHJO0sfSjfPWmaepnehTccS8tfkm9rVRKM8/rs:fit:200:200:1:0/g:ce/aHR0cHM6Ly9pLnl0/aW1nLmNvbS92aS9T/TGNKb25XVjlUWS9t/YXhyZXMyLmpwZz9z/cXA9LW9heW13RW9D/SUFLRU5BRjhxdUtx/UU1jR0FEd0FRSDRB/YllJZ0FLQUQ0b0NE/QWdBRUFFWVd5QmxL/Rm93RHc9PSZhbXA7/cnM9QU9uNENMQl91/MTdUaldvUm5XZ1l6/T0RSMVhLWkp2VzdU/Zw'
						original: string // 'https://i.ytimg.com/vi/SLcJonWV9TY/maxres2.jpg?sqp=-oaymwEoCIAKENAF8quKqQMcGADwAQH4AbYIgAKAD4oCDAgAEAEYWyBlKFowDw==&amp;rs=AOn4CLB_u17TjWoRnWgYzODR1XKZJvW7Tg'
					}
				}[]
				mutated_by_goggles: boolean
			}
			web: {
				type: 'search'
				results: {
					title: string
					url: string
					is_source_local: boolean
					is_source_both: boolean
					description: string
					page_age: string // 2025-01-21T09:15:03
					profile: {
						name: string
						url: string
						long_name: string
						img: string
					}
					language: string // 'en'
					family_friendly: boolean
					type: 'search_result'
					subtype: 'generic'
					is_live: boolean
					meta_url: {
						scheme: string // 'https'
						netloc: string // 'usun.usmission.gov'
						hostname: string //'usun.usmission.gov'
						favicon: string //'https://imgs.search.brave.com/YK9M-8O4u1moiUP-gGj7deZz2d5eXCdblkjZ5P5Og7g/rs:fit:32:32:1:0/g:ce/aHR0cDovL2Zhdmlj/b25zLnNlYXJjaC5i/cmF2ZS5jb20vaWNv/bnMvODE5OWIwYTc1/MjAwZmRkOTAzMjA4/YTUzM2Q2ZDQ2NDE2/Y2FiODUzZjZjMTZk/NzQzYWY3NWJmYWUx/YjE1YzQ4ZS91c3Vu/LnVzbWlzc2lvbi5n/b3Yv'
						path: string //'  › home  › our leaders  › president of the united states'
					}
					age: string // '3 weeks ago'
				}[]
				family_friendly: boolean
			}
		}
	} catch (error) {
		return
	}
}
