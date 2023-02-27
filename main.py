import sys
try:
    from gaApi.gaAnalytic import gaAnalytic
except ImportError:
    pass
from carRecommendation.lastViewCar import lastViewCar
from kmPerPrice.kmPerPrice import kmPerPrice
from carRecommendation.knnRecommendation import knnRecommendation

if __name__ == "__main__":
    # post gaAnalytic
    if sys.argv[1] == "post_gaAnalytic":
        gaAnalytic().post_gaAnalytic()

    # 마지막 열람 매물 기반 차량 추천
    if sys.argv[1] == "post_recommendCar":
        lastViewCar(
            sys.argv[2],
            sys.argv[3],
            sys.argv[4],
            sys.argv[5],
            sys.argv[6],
            sys.argv[7],
            sys.argv[8]).get_lastViewCar()

    # 유사매물 최소, 최대, 평균 가격 조회
    if sys.argv[1] == "get_kmPerPrice":
        kmPerPrice(
            sys.argv[2], #비교할 차량 주행거리 list (UNI_KM)
            sys.argv[3], #비교할 차량 가격 list (UNI_PRICE)
            sys.argv[4], #차량id (params.MCR_ID)
            sys.argv[5], #주행거리 (params.MCR_KM)
            sys.argv[6], #가격 (params.MCR_PRICE)
            sys.argv[7], #소분류 (params.MCR_SCD)
            sys.argv[8], #모델 (params.MCR_MODEL)
            sys.argv[9], #연식 (params.MCR_YEAR_MM)
            sys.argv[10], #톤 수 (params.MCR_TON)
            ).patch_kmPerPrice()

    # 주행거리 별 가격 분포 그래프 적재
    if sys.argv[1] == "patch_kmPerPrice":
        kmPerPrice(
            sys.argv[2], #비교할 차량 주행거리 list (UNI_KM)
            sys.argv[3], #비교할 차량 가격 list (UNI_PRICE)
            sys.argv[4], #차량id (params.MCR_ID)
            sys.argv[5], #주행거리 (params.MCR_KM)
            sys.argv[6], #가격 (params.MCR_PRICE)
            sys.argv[7], #소분류 (params.MCR_SCD)
            sys.argv[8], #모델 (params.MCR_MODEL)
            sys.argv[9], #연식 (params.MCR_YEAR_MM)
            sys.argv[10], #톤 수 (params.MCR_TON)
            ).patch_kmPerPrice(sys.argv[11]) #적재할 경로  (uploadPath)

    # 차량추천
    if sys.argv[1] == "post_recommendation":
        knnRecommendation(
            sys.argv[2], # USER
            sys.argv[3], # PASSWORD
            sys.argv[4], # input_data
            sys.argv[5], # user_points
        ).main()

