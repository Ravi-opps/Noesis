import os

import praw
from dotenv import load_dotenv


DEFAULT_SUBREDDITS = [
    "laptops",
    "SuggestALaptop",
    "buildapc",
    "india",
    "techsupport",
    "computers",
]


def create_reddit_client():
    load_dotenv()
    client_id = os.getenv("REDDIT_CLIENT_ID")
    client_secret = os.getenv("REDDIT_CLIENT_SECRET")
    username = os.getenv("REDDIT_USERNAME")
    user_agent = os.getenv("REDDIT_USER_AGENT")

    if not user_agent and username:
        user_agent = f"script:reddit.scraper:v1.0 (by u/{username})"

    if not client_id or not client_secret or not user_agent:
        return None

    return praw.Reddit(
        client_id=client_id,
        client_secret=client_secret,
        user_agent=user_agent,
    )


def is_valid_comment(comment):
    if comment.body in ["[deleted]", "[removed]"]:
        return False
    if comment.author is None:
        return False

    name = comment.author.name.lower()
    if "bot" in name:
        return False
    return True


def fetch_reddit_data(
    query="laptop",
    subreddits=None,
    posts_per_subreddit=5,
    comments_per_post=5,
):
    subreddits = subreddits or DEFAULT_SUBREDDITS
    reddit = create_reddit_client()

    if reddit is None:
        print(
            "Reddit credentials are missing. Set REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, "
            "and REDDIT_USER_AGENT (or REDDIT_USERNAME) in your environment."
        )
        return []

    final_data = []
    for sub_name in subreddits:
        try:
            subreddit = reddit.subreddit(sub_name)

            for post in subreddit.search(query, limit=posts_per_subreddit):
                post_data = {
                    "subreddit": sub_name,
                    "post_id": post.id,
                    "title": post.title,
                    "selftext": post.selftext,
                    "score": post.score,
                    "post_link": f"https://reddit.com{post.permalink}",
                    "comments": [],
                }

                post.comments.replace_more(limit=0)
                comments = post.comments
                sorted_comments = sorted(
                    comments,
                    key=lambda x: x.score if x.score else 0,
                    reverse=True,
                )

                count = 0
                for comment in sorted_comments:
                    if count >= comments_per_post:
                        break
                    if not is_valid_comment(comment):
                        continue

                    post_data["comments"].append(
                        {
                            "id": comment.id,
                            "link": f"https://reddit.com{comment.permalink}",
                            "author": comment.author.name if comment.author else None,
                            "body": comment.body,
                            "score": comment.score,
                        }
                    )
                    count += 1

                final_data.append(post_data)
        except Exception as e:
            print(f"Error with subreddit {sub_name}: {e}")

    return final_data



final_data=[
    {
        "subreddit": "GamingLaptops",
        "title": "ASUS TUF F15 long-term review?",
        "selftext": "Planning to buy, how does it hold up after months?",
        "score": 210,
        "comments": [
            {
                "link": "https://reddit.com/r/GamingLaptops/comments/abc1/c1",
                "body": "Thermals are decent but you need a cooling pad for long gaming sessions.",
                "score": 95
            },
            {
                "link": "https://reddit.com/r/GamingLaptops/comments/abc1/c2",
                "body": "Build quality is solid for the price, feels durable.",
                "score": 76
            },
            {
                "link": "https://reddit.com/r/GamingLaptops/comments/abc1/c3",
                "body": "Fans get loud under heavy load.",
                "score": 65
            },
            {
                "link": "https://reddit.com/r/GamingLaptops/comments/abc1/c4",
                "body": "Performance is great for mid-range gaming.",
                "score": 60
            },
            {
                "link": "https://reddit.com/r/GamingLaptops/comments/abc1/c5",
                "body": "Display is average, not very color accurate.",
                "score": 52
            }
        ]
    },

    {
        "subreddit": "SuggestALaptop",
        "title": "Is ASUS TUF worth it in 2025?",
        "selftext": "",
        "score": 180,
        "comments": [
            {
                "link": "https://reddit.com/r/SuggestALaptop/comments/def2/c1",
                "body": "Best value for money in budget gaming segment.",
                "score": 88
            },
            {
                "link": "https://reddit.com/r/SuggestALaptop/comments/def2/c2",
                "body": "Battery life is below average compared to competitors.",
                "score": 70
            },
            {
                "link": "https://reddit.com/r/SuggestALaptop/comments/def2/c3",
                "body": "Upgrade options are good, easy to add RAM and SSD.",
                "score": 64
            },
            {
                "link": "https://reddit.com/r/SuggestALaptop/comments/def2/c4",
                "body": "Keyboard feels a bit cheap.",
                "score": 55
            },
            {
                "link": "https://reddit.com/r/SuggestALaptop/comments/def2/c5",
                "body": "Great for students who want gaming + coding.",
                "score": 49
            }
        ]
    },

    {
        "subreddit": "buildapc",
        "title": "ASUS TUF vs Acer Nitro 5",
        "selftext": "Which one should I go for?",
        "score": 150,
        "comments": [
            {
                "link": "https://reddit.com/r/buildapc/comments/ghi3/c1",
                "body": "TUF has better durability but Nitro has slightly better cooling.",
                "score": 72
            },
            {
                "link": "https://reddit.com/r/buildapc/comments/ghi3/c2",
                "body": "Performance difference is negligible, depends on configuration.",
                "score": 66
            },
            {
                "link": "https://reddit.com/r/buildapc/comments/ghi3/c3",
                "body": "TUF wins in battery build, feels more rugged.",
                "score": 54
            },
            {
                "link": "https://reddit.com/r/buildapc/comments/ghi3/c4",
                "body": "Nitro has better display panel in some models.",
                "score": 50
            },
            {
                "link": "https://reddit.com/r/buildapc/comments/ghi3/c5",
                "body": "Check thermals before buying, varies by variant.",
                "score": 48
            }
        ]
    },

    {
        "subreddit": "india",
        "title": "ASUS TUF for college students?",
        "selftext": "",
        "score": 120,
        "comments": [
            {
                "link": "https://reddit.com/r/india/comments/jkl4/c1",
                "body": "Heavy laptop, not ideal if you carry daily.",
                "score": 60
            },
            {
                "link": "https://reddit.com/r/india/comments/jkl4/c2",
                "body": "Good performance for coding and gaming.",
                "score": 55
            },
            {
                "link": "https://reddit.com/r/india/comments/jkl4/c3",
                "body": "Battery won’t last full day of classes.",
                "score": 50
            },
            {
                "link": "https://reddit.com/r/india/comments/jkl4/c4",
                "body": "Value for money in Indian market.",
                "score": 45
            },
            {
                "link": "https://reddit.com/r/india/comments/jkl4/c5",
                "body": "Service centers are decent in metro cities.",
                "score": 40
            }
        ]
    },

    {
        "subreddit": "techsupport",
        "title": "ASUS TUF overheating issues?",
        "selftext": "Facing high temps while gaming",
        "score": 95,
        "comments": [
            {
                "link": "https://reddit.com/r/techsupport/comments/mno5/c1",
                "body": "Repasting CPU helps reduce temps significantly.",
                "score": 58
            },
            {
                "link": "https://reddit.com/r/techsupport/comments/mno5/c2",
                "body": "Undervolting can fix thermal spikes.",
                "score": 52
            },
            {
                "link": "https://reddit.com/r/techsupport/comments/mno5/c3",
                "body": "Stock cooling is not great for heavy gaming.",
                "score": 48
            },
            {
                "link": "https://reddit.com/r/techsupport/comments/mno5/c4",
                "body": "Clean fans regularly to avoid overheating.",
                "score": 44
            },
            {
                "link": "https://reddit.com/r/techsupport/comments/mno5/c5",
                "body": "Use performance mode in Armoury Crate.",
                "score": 40
            }
        ]
    },

    {
        "subreddit": "laptops",
        "title": "ASUS TUF battery life review",
        "selftext": "",
        "score": 110,
        "comments": [
            {
                "link": "https://reddit.com/r/laptops/comments/pqr6/c1",
                "body": "Battery lasts around 4-5 hours normal use.",
                "score": 62
            },
            {
                "link": "https://reddit.com/r/laptops/comments/pqr6/c2",
                "body": "Gaming drains battery very quickly.",
                "score": 58
            },
            {
                "link": "https://reddit.com/r/laptops/comments/pqr6/c3",
                "body": "Not meant for portability honestly.",
                "score": 50
            },
            {
                "link": "https://reddit.com/r/laptops/comments/pqr6/c4",
                "body": "Battery optimization settings help a bit.",
                "score": 46
            },
            {
                "link": "https://reddit.com/r/laptops/comments/pqr6/c5",
                "body": "Better keep charger with you always.",
                "score": 42
            }
        ]
    },

    {
        "subreddit": "pcmasterrace",
        "title": "Is ASUS TUF reliable?",
        "selftext": "",
        "score": 140,
        "comments": [
            {
                "link": "https://reddit.com/r/pcmasterrace/comments/stu7/c1",
                "body": "TUF series is known for durability.",
                "score": 70
            },
            {
                "link": "https://reddit.com/r/pcmasterrace/comments/stu7/c2",
                "body": "Not premium but reliable enough.",
                "score": 65
            },
            {
                "link": "https://reddit.com/r/pcmasterrace/comments/stu7/c3",
                "body": "Some models had thermal complaints.",
                "score": 60
            },
            {
                "link": "https://reddit.com/r/pcmasterrace/comments/stu7/c4",
                "body": "Good entry-level gaming laptop.",
                "score": 55
            },
            {
                "link": "https://reddit.com/r/pcmasterrace/comments/stu7/c5",
                "body": "Longevity depends on usage and cooling.",
                "score": 50
            }
        ]
    },

    {
        "subreddit": "IndianGaming",
        "title": "ASUS TUF gaming performance?",
        "selftext": "",
        "score": 130,
        "comments": [
            {
                "link": "https://reddit.com/r/IndianGaming/comments/vwx8/c1",
                "body": "Runs most AAA games at medium-high settings.",
                "score": 68
            },
            {
                "link": "https://reddit.com/r/IndianGaming/comments/vwx8/c2",
                "body": "FPS drops if thermals not managed.",
                "score": 60
            },
            {
                "link": "https://reddit.com/r/IndianGaming/comments/vwx8/c3",
                "body": "Good GPU performance for the price.",
                "score": 58
            },
            {
                "link": "https://reddit.com/r/IndianGaming/comments/vwx8/c4",
                "body": "Add extra RAM for better performance.",
                "score": 52
            },
            {
                "link": "https://reddit.com/r/IndianGaming/comments/vwx8/c5",
                "body": "SSD upgrade improves load times.",
                "score": 48
            }
        ]
    },

    {
        "subreddit": "LaptopDeals",
        "title": "ASUS TUF deal worth it?",
        "selftext": "",
        "score": 90,
        "comments": [
            {
                "link": "https://reddit.com/r/LaptopDeals/comments/yz12/c1",
                "body": "Great deal if under budget range.",
                "score": 55
            },
            {
                "link": "https://reddit.com/r/LaptopDeals/comments/yz12/c2",
                "body": "Specs are good for the price point.",
                "score": 50
            },
            {
                "link": "https://reddit.com/r/LaptopDeals/comments/yz12/c3",
                "body": "Check model variant before buying.",
                "score": 48
            },
            {
                "link": "https://reddit.com/r/LaptopDeals/comments/yz12/c4",
                "body": "Better deals appear during sales.",
                "score": 45
            },
            {
                "link": "https://reddit.com/r/LaptopDeals/comments/yz12/c5",
                "body": "Warranty matters, don’t ignore it.",
                "score": 42
            }
        ]
    },

    {
        "subreddit": "computers",
        "title": "ASUS TUF overall experience",
        "selftext": "",
        "score": 100,
        "comments": [
            {
                "link": "https://reddit.com/r/computers/comments/uvw9/c1",
                "body": "Balanced laptop for performance and price.",
                "score": 60
            },
            {
                "link": "https://reddit.com/r/computers/comments/uvw9/c2",
                "body": "Not the best display but acceptable.",
                "score": 55
            },
            {
                "link": "https://reddit.com/r/computers/comments/uvw9/c3",
                "body": "Cooling could be improved.",
                "score": 52
            },
            {
                "link": "https://reddit.com/r/computers/comments/uvw9/c4",
                "body": "Good entry-level gaming option.",
                "score": 48
            },
            {
                "link": "https://reddit.com/r/computers/comments/uvw9/c5",
                "body": "Worth buying during discounts.",
                "score": 45
            }
        ]
    }
]

SAMPLE_FINAL_DATA = final_data


def get_final_data(
    use_live_reddit=False,
    query="laptop",
    subreddits=None,
    posts_per_subreddit=5,
    comments_per_post=5,
):
    if not use_live_reddit:
        return SAMPLE_FINAL_DATA

    live_data = fetch_reddit_data(
        query=query,
        subreddits=subreddits,
        posts_per_subreddit=posts_per_subreddit,
        comments_per_post=comments_per_post,
    )
    if live_data:
        return live_data
    return SAMPLE_FINAL_DATA


if __name__ == "__main__":
    data = get_final_data(use_live_reddit=True)
    print(data)
