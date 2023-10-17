### 중고트럭 거래 플랫폼 회사 인턴 프로젝트입니다.


### **요약**

- **사용자 설문 기반** **추천 시스템 모델링, 시계열 예측 모델링, 모델 Serving**
    
    

### **시기**

- 프로젝트 진행 기간 : 2022.11~ 2023.02
- 참여 인원 : 1

### **역할**

- **KNN을 활용한 사용자 설문 기반 추천 서비스 모델링**
- **RNN LSTM을 활용한 시계열 예측 모델링**
- **Node.js, Javascript, Mysql을 활용한 Model Serving**
- **백엔드 API 구축**
- **DB 구축**
- **React를 활용한 WEB Front 구현**

### 데이터 소개

✔️ **본 회사의 축적된 트럭 정보(트럭 유형, 길이, 톤, 바퀴 갯수 등등..)의 DB 데이를 활용하였습니다.**

## 주요 내용

### ✔️ 개요

1. 중고 트럭 거래 플랫폼을 통해 유저들이 구입하려는 중고트럭을 쉽게 탐색할 수 있도록 차량 구매자 요구에 따른 근접매물 추천 서비스를 제공하고자 개발 목표 수립

1. 트럭 번호판 시세 및 트럭 수요 분석 및 Trend 보고서를 매 분기마다 발행하는 것을 목표 수립

### ✔️ 주요기능

1. **사용자 설문 기반 추천 서비스**
    - 데이터 전처리
        - 서로 다른 단위의 차량 데이터 정보를 Min-Max Scaling하여 통일 및 정규화
        - 차량의 톤수, 브랜드, 딜러의 신뢰도, 차량 상태, 유저의 보유자산 상태를 측정하고 EDA
        
    - 모델링
        - 3차원 공간의 5개의 축(EDA된 데이터)을 통해 5차원으로 표현하여 정량적인 데이터를 0~1사이의 점수를 Scaling 통해 도출 하였습니다.’
        - KNN 공식을 이용해서 설문을 통해 유저가 선택한 차량의 총 점수와 본 회사 DB에 저장되어 있는 차량의 점수와 비교하는 작업을 통해 유저가 원하는 차량에 근접한 매물을 찾아주는 알고리즘을 구현하였습니다.
        
    - 결과
        - 가장 가까운 거리에 있는 차량 6대를 추천하여 서버에 전송
        
    - 검증
        - precision@k와 recall@k를 활용한 검증
        - 각 0.8 이상의 결과 도출
        
2. **시계열 예측 모델링**
    - 데이터
        - 통계청 화물 자동차 등록 데이터와 본 회사 DB의 번호판 가격, 시계열 데이터를 이용
        - 스타트업의 단점인 부족한 데이터 문제를 해결하기 위해 배치성 데이터를 추가로 사용
        
    - 모델링
        - RNN의 LSTM 모델을 사용하여 차량 번호판 가격의 12개월치의 시퀀스 데이터로부터 1개월치의 데이터를 예측하는 모델을 구현하였습니다.
        - 다변량 변수 추가와 하이퍼 파라미터 튜닝으로 모델을 개선
        
    - 검증
        - MAPE를 활용한 검증
        - 10%의 정확도 결과 도출
        
3. **모델 서빙**
    - 추천 시스템 모델 검증 이후 회사의 웹, 앱 백엔드에 모델을 붙이고 API를 설계하였습니다.
    - Node.js와 JavaScript를 활용하여 CRUD를 바탕으로 백엔드 API 설계
    - 유저가 원하는 차량(톤수, 브랜드, 차량상태 등)에 대한 설문이 필요하기 때문에 설문을 저장할  Mysql DB table을 구축
    - POST 형식으로 유저들이 선택할 질문에 대한 파라미터를 설계
    - 정답을 받아오면 DB에 create해주고 추천 시스템 모델이 동작할 때 DB에 저장되어 있는 유저가 선택한 질문을 read하여 추천이 되도록 설계하였습니다.
    - 개발 서버에 배포
    
    ## ✅결과
    
    1. KNN을 활용한 사용자 설문 기반 추천 서비스를 성공적으로 배포하여 실전에서의 인공지능에 대한 역량을 키울 수 있었던 경험이었습니다.
    2. 모델 서빙 능력 또한 갖출 수 있었던 프로젝트였습니다.
       
- 사용자로부터 설문을 받아오기 위한 json 파일 
  - question.json, 

- 차량의 group을 설정 및 group별 물동량 filtering을 위한 json 파일
  - GROUP_USER.json
  
- group별 차량의 상세 정보가 저장 되어 있는 DB의 data를 가져오기 위한 json 파일
  - GROUP_TREE.json
  
- 추천 시스템 모델 
  - knnRecommendation.py
  
- APP을 위한 사용자 설문 post 방식의 B-E 설계 
  - if_python.js
  
- Web을 위한 사용자 설문 post 방식의 react Front 설계
  - web_if_main.js
    
# 🛠 기술 스택

### ▪ 언어
<img src="https://img.shields.io/badge/python-3776AB?style=for-the-badge&logo=python&logoColor=white">

### ▪ 주요 라이브러리
<img src="https://img.shields.io/badge/scikit learn-F7931E?style=for-the-badge&logo=scikit learn&logoColor=white"> <img src="https://img.shields.io/badge/pandas-150458?style=for-the-badge&logo=pandas&logoColor=white">
<img src="https://img.shields.io/badge/numpy-013243?style=for-the-badge&logo=numpy&logoColor=white"> <img src="https://img.shields.io/badge/KNN-99CC00?style=for-the-badge&logo=KNN&logoColor=white"> <img src="https://img.shields.io/badge/matplotlib-0058CC?style=for-the-badge&logo=matplotlib&logoColor=white"> <img src="https://img.shields.io/badge/RNN-FF4F8B?style=for-the-badge&logo=RNN&logoColor=white">
<img src="https://img.shields.io/badge/LSTM-FF0000?style=for-the-badge&logo=LSTM&logoColor=white"> <img src="https://img.shields.io/badge/JavaScript-7FADF2?style=for-the-badge&logo=JavaScript&logoColor=white"> <img src="https://img.shields.io/badge/NodeJS-7FADF2?style=for-the-badge&logo=NodeJS&logoColor=white"> <img src="https://img.shields.io/badge/MySQL-7FADF2?style=for-the-badge&logo=MySQL&logoColor=white"> <img src="https://img.shields.io/badge/React-7FADF2?style=for-the-badge&logo=React&logoColor=white">

### ▪ 개발 툴
<img src="https://img.shields.io/badge/VS code-2F80ED?style=for-the-badge&logo=VS code&logoColor=white">

### ▪ 협업 툴
<img src="https://img.shields.io/badge/Github-181717?style=for-the-badge&logo=Github&logoColor=white">


  
  
