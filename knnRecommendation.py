#!/usr/bin/env python
# coding: utf-8

# In[3]:
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.detach(), encoding = 'utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.detach(), encoding = 'utf-8')
import pandas as pd
import pymysql.cursors
from datetime import datetime as dt
import json
with open('././assets/json/Recommendation_json/question.json', 'r', encoding='utf-8') as f:
    question = json.load(f)
from sklearn.preprocessing import MinMaxScaler  # MIN - MAX 정규화를 위한 라이브러리
import numpy as np
import copy
import re
now = pd.to_datetime(dt.today())
pd.set_option('max_columns', None)
pd.set_option('max_rows', None)

class DBHelper:
    # 서버연결
    def __init__(self, USER, PASSWORD):
        # 실서버
        # self.host = "3.35.245.243"
        # 개발서버
        self.host = "15.165.252.49"
        self.user = USER
        self.password = PASSWORD
        self.db = "itruck"
        self.port = 3306
        self.charset = 'utf8'

    def __connect__(self):
        self.con = pymysql.connect(host=self.host,
                                   user=self.user,
                                   password=self.password,
                                   db=self.db,
                                   port=self.port,
                                   charset=self.charset,
                                   cursorclass=pymysql.cursors.DictCursor)
        self.cur = self.con.cursor()

    def __disconnect__(self):
        self.con.close()

    def execute(self, sql):
        self.__connect__()
        self.cur.execute(sql)
        self.__disconnect__()

    def fetch(self, sql):
        self.__connect__()
        self.cur.execute(sql)
        result = self.cur.fetchall()
        self.__disconnect__()
        return result

    def table(self, sql):
        result = pd.DataFrame(self.fetch(sql))
        return result

class knnRecommendation(DBHelper):
    def __init__(self, USER, PASSWORD, input_data, user_points):
        self.input_data = input_data
        self.user_points = user_points
        self.dfs = DBHelper(USER, PASSWORD).table(
            "SELECT\
                m.MCR_ID,\
                m.MCR_SCD,\
                m.MCR_BRAND_CD,\
                m.MCR_TON,\
                m.MCR_YEAR_MM,\
                m.MCR_KM,\
                m.MCR_DESC,\
                m.MCR_PRICE,\
                m.MCR_PLATE_TYPE,\
                m.MCR_REAL_YN,\
                m.MCR_REG_DT,\
                m.MCR_DIRECT_YN,\
                m.MCR_AXLE,\
                m.MCR_WING_TOP,\
                m.MCR_IMG1,\
                m.MCR_IMG2,\
                m.MCR_IMG3,\
                m.MCR_IMG4,\
                m.MCR_IMG5,\
                m.MCR_IMG6,\
                m.MCR_IMG7,\
                m.MCR_IMG8,\
                m.MCR_IMG9,\
                m.MCR_IMG10,\
                m.MCR_IMG11,\
                m.MCR_IMG12,\
                m.MCR_IMG13,\
                m.MCR_IMG14,\
                m.MCR_IMG15,\
                m.MCR_IMG16,\
                m.MCR_IMG17,\
                m.MCR_IMG18,\
                m.MCR_IMG19,\
                m.MCR_IMG20,\
                d.DAL_ID,\
                d.DAL_COM_NUM,\
                d.DAL_REWARD_YN,\
                d.DAL_REG_DT,\
                d.DAL_LAST_LOGIN_DT,\
                c.CLICK_NUM \
            FROM\
                TB_MYCAR AS m\
            LEFT OUTER JOIN TB_DEALER AS d\
            ON\
                m.DAL_ID = d.DAL_ID\
            LEFT OUTER JOIN TB_CLICK AS c\
            ON\
                m.MCR_ID = c.PROD_ID\
            LEFT OUTER JOIN TB_MYCAR_OPTION AS op\
            ON\
                m.MCR_ID = op.MCR_ID \
            {}".format(input_data))

        self.dfs_dal = DBHelper(USER, PASSWORD).table(
            "SELECT\
                m.DAL_ID,\
                COUNT(*) AS DAL_TOTAL_UPT_CNT\
            FROM\
                TB_MYCAR AS m\
            LEFT OUTER JOIN TB_DEALER AS d\
            ON\
                m.DAL_ID = d.DAL_ID\
            LEFT OUTER JOIN TB_CLICK AS c\
            ON\
                m.MCR_ID = c.PROD_ID\
            LEFT OUTER JOIN TB_MYCAR_OPTION AS op\
            ON\
                m.MCR_ID = op.MCR_ID \
            {}\
            GROUP BY\
                m.DAL_ID".format(input_data))

        self.df = pd.merge(left=self.dfs, right=self.dfs_dal, on='DAL_ID', how='left') 
    
    def preprocess_mycar(self):
        df = self.df
        df['DESC_LEN'] = df['MCR_DESC']
        df['DAL_REG_DT'] = df['DAL_REG_DT'].astype(str).str.replace(pat=r'[a-zA-Z]+', repl= r' ', regex=True)
        df['DAL_LAST_LOGIN_DT'] = df['DAL_LAST_LOGIN_DT'].astype(str).str.replace(pat=r'[a-zA-Z]+', repl= r' ', regex=True)
        df['MCR_REG_DT'] = df['MCR_REG_DT'].astype(str).str.replace(pat=r'[a-zA-Z]+', repl= r' ', regex=True)

        df["DESC_LEN"] = df["DESC_LEN"].str.replace(pat=r'[^\w]', repl=r'', regex=True)
        df["DESC_LEN"] = df["DESC_LEN"].str.len().fillna(0)
        
        df['DAL_LAST_LOGIN_DT'] = pd.to_datetime(df['DAL_LAST_LOGIN_DT'], format='%Y-%m-%d %H:%M:%S', errors='coerce')
        df['DAL_REG_DT'] = pd.to_datetime(df['DAL_REG_DT'], format='%Y-%m-%d %H:%M:%S', errors='coerce')
        df['MCR_REG_DT'] = pd.to_datetime(df['MCR_REG_DT'], format='%Y-%m-%d %H:%M:%S', errors='coerce')
        
        df["DAL_COM_NUM"] = df["DAL_COM_NUM"].str.len()
        
        df.loc[df["DAL_COM_NUM"] <= 5, 'DAL_COM_NUM'] = 0
        df.loc[df["DAL_COM_NUM"] > 5, 'DAL_COM_NUM'] = 1
        
        # MCR_IMG1 ~ MCR_IMG20 이미지 파일은 존재할경우 1, Null일경우 0으로 변환
        for i in range(1, 21):
            df[['MCR_IMG{}'.format(i)]] = df[['MCR_IMG{}'.format(i)]].where(df[['MCR_IMG{}'.format(i)]].isnull(), 1).fillna(0)

        # 변환한 값에 대해 모두 더한값을 저장하는 MCR_IMG 컬럼 생성
        df['IMG_COUNT'] = 0

        # 연산(Count MCR_IMG1 ~ MCR_IMG20) & drop 이미지 columns
        for i in range(1, 21):
            df['IMG_COUNT'] += df[f'MCR_IMG{i}']
            df.drop(columns=[f"MCR_IMG{i}"], inplace=True)
            
        df['MCR_YEAR_MM'] = pd.to_datetime(df['MCR_YEAR_MM'], format='%Y-%m-%d', errors='coerce')
        df.drop(df[df['MCR_YEAR_MM'] > now].index, inplace=True)
        
        df['MCR_PLATE_TYPE'] = df['MCR_PLATE_TYPE'].replace('0402', 1).replace('0401', 0)
        
        df['MCR_REAL_YN'] = df['MCR_REAL_YN'].replace('N', 0).replace('Y', 1)
        df['MCR_DIRECT_YN'] = df['MCR_DIRECT_YN'].replace('N', 0).replace('Y', 1)
        
        df['DAL_REWARD_YN'] = df['DAL_REWARD_YN'].replace('N', 0).replace('Y', 1)
        
        df['DAL_LAST_LOGIN_DT'].fillna(df['DAL_REG_DT'], inplace=True)
        
        df['MCR_TON'] = df['MCR_TON'].replace('기타', '0').astype(float)
        # df['MCR_TON'] = eda.ton_masking(df, 'MCR_TON')
        df['MCR_KM'] = df['MCR_KM'].astype("int64")
        df['MCR_PRICE'] = df['MCR_PRICE'].astype("int64")

        df['DAILYPRODUCT'] = (df['DAL_LAST_LOGIN_DT'] - df['DAL_REG_DT']).dt.days / df['DAL_TOTAL_UPT_CNT']
        df['DAILYVIEW'] = (df['CLICK_NUM'] / ((now - df['DAL_REG_DT']).dt.days + 1)).fillna(0)
        df['DAILYVIEW'] = -df['DAILYVIEW']
        
        df = df.drop(columns=[ 'DAL_REG_DT', 'DAL_REG_DT', 'DAL_LAST_LOGIN_DT', 'CLICK_NUM', 'DAL_ID', 'DAL_TOTAL_UPT_CNT'])
        # 일평균 주행거리가 600km 초과인 매물 drop
        df = df.drop(df[df['MCR_KM'] / ((now - df['MCR_YEAR_MM']).dt.days) > 600].index)
        # 차량상태 점수를 위한 주행거리 뒤집기
        df['MCR_KM'] = -df['MCR_KM']

        # 100만원 이하, 3억 이상인 차량 drop
        df = df.drop(df[df['MCR_PRICE'] <= 100].index)
        df = df.drop(df[df['MCR_PRICE'] >= 30000].index)
        
        df.set_index('MCR_ID', inplace=True)
    
        return df

    def get_car_bias_points(self):
        df = self.preprocess_mycar()
        user_points1 = self.user_points1()
        scaler = MinMaxScaler()
        
        # car_ton = [
        #         (1, 1.2),
        #         (1.3, 4.5),
        #         (4.5, 5),
        #         (5, 11.5),
        #         (11.5, 27),
        #         ('트랙터'),
        #     ]
        car_ton = [
                (1, 1.9),
                (2, 3.5),
                (4.5, 7.9),
                (8, 18),
                (19, 27),
                ('트랙터'),
            ]
        
        car_brand = [
            ('C'),
            ('D')
        ]
        
        # 신뢰도 높음 점수
        df_reliability = df[[
            "MCR_REAL_YN", # 실매물확인여부
            "DAL_COM_NUM", # 종사원증번호여부
            "DAILYPRODUCT", # 일평균등록매물
            "DAL_REWARD_YN", # 헛걸음보상제공여부
        ]]
        reliability = scaler.fit_transform(df_reliability)

        # 차량상태 좋음 점수
        df_condition = df[[
            "MCR_KM", # 주행거리
            "MCR_PRICE", # 가격
            "DESC_LEN", # 상세설명 길이
            "IMG_COUNT", # 이미지 수
        ]]

        condition = scaler.fit_transform(df_condition)
        condition = np.concatenate((condition, scaler.fit_transform(df[["MCR_YEAR_MM"]])), axis=1)
        # 보유자산 낮음 점수
        df_asset = df[[
            "MCR_DIRECT_YN", # 직거래 매물여부
            "MCR_PLATE_TYPE", # 번호판 종류
            "DAILYVIEW", # 일평균조회수
        ]]

        asset = scaler.fit_transform(df_asset)
        
        #톤 점수
        # if user_points1['TON']['TON_Q1'] != '6' :
        if (user_points1['TON']['TON_Q1'] != '6'):
            dfa = df.copy()
            dfa['톤수_점수'] = None
            for i, t in enumerate(car_ton[0:5]):
                dfa.loc[
                    (dfa['MCR_TON'] >= t[0]) & (dfa['MCR_TON'] <= t[1]), '톤수_점수'
                ] = (len(car_ton[0:5]) / (len(car_ton[0:5]) * (len(car_ton[0:5]) - 1))) * ((i + 1) - 1)
            ton = scaler.fit_transform(pd.DataFrame(-abs(dfa['톤수_점수'] - int(user_points1['TON']['TON_Q1']))))
        
        # 브랜드 점수
        dfa_2 = df.copy()
        dfa_2['브랜드_점수'] = None
        for i, b in enumerate(car_brand):
            globals()["i_temp"] = i
            k = dfa_2.loc[
                (dfa_2['MCR_BRAND_CD'].str.contains(b)), '브랜드_점수'
            ] = (len(car_brand) / (len(car_brand) * (len(car_brand) - 1))) * ((i + 1) - 1) 
            l = dfa_2['브랜드_점수']
        brand = scaler.fit_transform(pd.DataFrame(-abs(dfa_2['브랜드_점수'] - int(user_points1['BRAND']['BRAND_Q1']))))

        if (user_points1['TON']['TON_Q1'] != '6'):
            df_knn = pd.DataFrame({
                'RELIABILITY': (reliability.sum(axis=1) / reliability.shape[1]),
                'CONDITION': (condition.sum(axis=1) / condition.shape[1]),
                'ASSET': (asset.sum(axis=1) / asset.shape[1]),
                'TON': (ton.sum(axis=1) / ton.shape[1]),
                'BRAND' : (brand.sum(axis=1) / brand.shape[1]),
            }, index=df.index,)
        else : 
            df_knn = pd.DataFrame({
                'RELIABILITY': (reliability.sum(axis=1) / reliability.shape[1]),
                'CONDITION': (condition.sum(axis=1) / condition.shape[1]),
                'ASSET': (asset.sum(axis=1) / asset.shape[1]),
                'BRAND' : (brand.sum(axis=1) / brand.shape[1]),
            }, index=df.index,)
        
        return df_knn

    def get_user_bias_points(self):
        questions = question
        questions['TON']['TON_Q1']['QUEST']['QUESTION_NUMBER'] = ["1", "2", "3", "4", "5"]
        # user_bias_points = questions
        user_points1 = self.user_points1()
        user_bias_points = dict()
        for (axis_question, quests_question), (axis_answer, quests_answer) in zip(questions.items(), user_points1.items()):
            user_bias_points[axis_answer] = list()
            for (q_num, quest_question), (a_num, quest_answer) in zip(quests_question.items(), quests_answer.items()):
                user_bias_points[axis_answer].append((len(quest_question['QUEST']["QUESTION_NUMBER"]) / (len(quest_question['QUEST']["QUESTION_NUMBER"]) * (len(quest_question['QUEST']["QUESTION_NUMBER"]) - 1))) * (int(quest_answer) - 1))
            user_bias_points[axis_answer] = sum(user_bias_points[axis_answer]) / len(user_bias_points[axis_answer])
    
        return user_bias_points

    def sort_by_distance(self):
        df_knn = self.get_car_bias_points()
        # df_knn_tractor = self.get_car_bias_points()
        user_bias_points = self.get_user_bias_points()
        if ("TON" not in df_knn) :
            X, Y, Z, B = np.array(df_knn['RELIABILITY']), np.array(df_knn['CONDITION']), np.array(df_knn['ASSET']), np.array(df_knn['BRAND'])
            
            distance = np.sqrt(
                        ((X - user_bias_points['RELIABILITY']) ** 2) +
                        ((Y - user_bias_points['CONDITION']) ** 2) +
                        ((Z - user_bias_points['ASSET']) ** 2) +
                        ((B - user_bias_points['BRAND']) ** 2)
                    )
            df_knn['거리'] = distance
            result_ID = df_knn.sort_values(by='거리').index[:6]

        elif (df_knn['TON'].isnull().values.all() == True) :
            df_knn = df_knn.dropna(how='all', axis='columns')
            X, Y, Z, B = np.array(df_knn['RELIABILITY']), np.array(df_knn['CONDITION']), np.array(df_knn['ASSET']), np.array(df_knn['BRAND'])
            
            distance = np.sqrt(
                        ((X - user_bias_points['RELIABILITY']) ** 2) +
                        ((Y - user_bias_points['CONDITION']) ** 2) +
                        ((Z - user_bias_points['ASSET']) ** 2) +
                        ((B - user_bias_points['BRAND']) ** 2)
                    )
            df_knn['거리'] = distance
            result_ID = df_knn.sort_values(by='거리').index[:6]
            
        else :
            X, Y, Z, T, B = np.array(df_knn['RELIABILITY']), np.array(df_knn['CONDITION']), np.array(df_knn['ASSET']), np.array(df_knn['TON']), np.array(df_knn['BRAND'])
            
            distance = np.sqrt(
                        ((X - user_bias_points['RELIABILITY']) ** 2) +
                        ((Y - user_bias_points['CONDITION']) ** 2) +
                        ((Z - user_bias_points['ASSET']) ** 2) +
                        ((T - user_bias_points['TON']) ** 2) +
                        ((B - user_bias_points['BRAND']) ** 2)
                    )
            df_knn['거리'] = distance
            result_ID = df_knn.sort_values(by='거리').index[:6]

        return result_ID
       
    def user_points1 (self):
        questions = question
        user_points = self.user_points

        user_points=user_points.replace(",","")
        question_user = copy.deepcopy(questions)

        question_user['TON']['TON_Q1']['QUEST']['QUESTION_NUMBER'] = user_points[0]
        question_user['BRAND']['BRAND_Q1']['QUEST']['QUESTION_NUMBER'] = user_points[1]
        question_user['RELIABILITY']['RELIABILITY_Q1']['QUEST']['QUESTION_NUMBER'] = user_points[2]
        question_user['RELIABILITY']['RELIABILITY_Q2']['QUEST']['QUESTION_NUMBER'] = user_points[3]
        question_user['RELIABILITY']['RELIABILITY_Q3']['QUEST']['QUESTION_NUMBER'] = user_points[4]
        question_user['RELIABILITY']['RELIABILITY_Q4']['QUEST']['QUESTION_NUMBER'] = user_points[5]
        question_user['RELIABILITY']['RELIABILITY_Q5']['QUEST']['QUESTION_NUMBER'] = user_points[6]
        question_user['CONDITION']['CONDITION_Q1']['QUEST']['QUESTION_NUMBER'] = user_points[7]
        question_user['CONDITION']['CONDITION_Q2']['QUEST']['QUESTION_NUMBER'] = user_points[8]
        question_user['CONDITION']['CONDITION_Q3']['QUEST']['QUESTION_NUMBER'] = user_points[9]
        question_user['CONDITION']['CONDITION_Q4']['QUEST']['QUESTION_NUMBER'] = user_points[10]
        question_user['ASSET']['ASSET_Q1']['QUEST']['QUESTION_NUMBER'] = user_points[11]
        question_user['ASSET']['ASSET_Q2']['QUEST']['QUESTION_NUMBER'] = user_points[12]
        question_user['ASSET']['ASSET_Q3']['QUEST']['QUESTION_NUMBER'] = user_points[13]

        user_points1 = dict() 
        for axis, quests in question_user.items():
            user_points1[axis] = dict()
            for q_num, quest in quests.items():
                user_points1[axis][q_num] = quest['QUEST']["QUESTION_NUMBER"]
        return user_points1
    # def main(self):
    #     result_ID = self.sort_by_distance()
    #     print(result_ID)
    def main(self):
        try :
            result_ID = self.sort_by_distance()
        except ValueError:
             result_ID = ''
        recommend = re.sub(' ', '', str(list(result_ID))[1:-1])
        if not recommend:
            print('0', end='')
        if recommend:
            print(f'{recommend}', end='')
   
# # In[ ]:





# %%