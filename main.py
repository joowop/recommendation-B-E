import sys

from carRecommendation.knnRecommendation import knnRecommendation

    # 차량추천
    if sys.argv[1] == "post_recommendation":
        knnRecommendation(
            sys.argv[2], # USER
            sys.argv[3], # PASSWORD
            sys.argv[4], # input_data
            sys.argv[5], # user_points
        ).main()

