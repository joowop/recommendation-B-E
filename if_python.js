/**************************************************
 * 프로젝트 명 : iTruck
 * 설     명 : Python Nodejs 연동
 * 작  성  자 : 김효중
 * 작 성 일 자 : 2021-07-19
 * ------------------------------------------------
 * 2021-xx-xx : 초안
 **************************************************/

let express = require("express");
let router = express.Router();
let async = require("async");
let db = require("../lib/connection");
let comm = require("../lib/common.js");
const app = express();
const { Mycar, UniInfo } = require("../models");
const { spawnSync } = require("child_process");

router.patch("/carRecommendationActivate", function (req, res, next) {
  let params = req.body;

  let MEM_REC_CAR = "";

  if (!params.USR_ID)
    return res.json({ code: 412, message: "USR_ID 입력해 주세요!", data: [] });
  if (!params.USR_TYPE)
    return res.json({
      code: 412,
      message: "USR_TYPE 입력해 주세요!",
      data: [],
    });
  if (
    params.USR_TYPE != "MEM" &&
    params.USR_TYPE != "DAL" &&
    params.USR_TYPE != "COM"
  )
    return res.json({
      code: 412,
      message: "USR_TYPE(MEM/DAL/COM) 입력해 주세요!",
      data: [],
    });
  const spawn = require("child_process").spawn;
  const result = spawn("python3", [
    "./pythons/carRecommendation/carRecommendationActivate.py",
    process.env.MYSQL_LIVE_USER,
    process.env.MYSQL_LIVE_PWD,
    params.USR_ID,
  ]);

  result.stdout.on("data", function (data) {
    MEM_REC_CAR = data.toString();

    async.waterfall(
      [
        function (done) {
          let sqlParams;
          let query;

          sqlParams = [
            {
              MEM_REC_CAR: MEM_REC_CAR,
            },
            parseInt(params.USR_ID),
          ];

          query = "UPDATE TB_MEMBER SET ? WHERE MEM_ID = ?";

          db.exec(query, sqlParams, function (err, results) {
            done(err, results);
          });
        },
      ],
      function (err, results) {
        if (err) {
          res.json({ code: 500, message: "#### [ERROR] : ", data: [err] });
        } else {
          res.json({ code: 200, message: "", data: [] });
        }
      }
    );
  });
  result.stderr.on("data", function (err) {
    console.log("서비스가 일시적으로 원활하지 않습니다.");
  });
});

router.get("/carRecommendation", function (req, res, next) {
  let params = req.query;
  let values = [];

  if (!params.PAGE)
    return res.json({ code: 412, message: "PAGE 입력해 주세요!", data: [] });
  if (!params.USR_ID)
    return res.json({ code: 412, message: "USR_ID 입력해 주세요!", data: [] });
  if (!params.USR_TYPE)
    return res.json({
      code: 412,
      message: "USR_TYPE 입력해 주세요!",
      data: [],
    });

  let query =
    " SELECT " +
    "   d.DAL_IMG, " +
    "   d.DAL_BEST_YN, " +
    "   d.DAL_NAME,  " +
    "   d.DAL_ID, " +
    "   c.MCR_REAL_YN, " +
    "   c.MCR_AD_YN, " +
    "   c.MCR_ID, " +
    "   c.MCR_IMG1, " +
    "   c.MCR_LCD, " +
    "   c.MCR_YEAR_MM, " +
    "   c.MCR_ETC_NM, " +
    "   c.MCR_UPT_DT, " +
    "   '' as MCR_THUM, " +
    "   c.MCR_SCD_SNM, " +
    "   (SELECT  CAR_NM FROM TB_CAR  WHERE CAR_CODE = MCR_BRAND_CD) as MCR_BRAND_NM, " +
    "   (SELECT  CAR_NM FROM TB_CAR  WHERE CAR_CODE = MCR_MODEL_CD) as MCR_MODEL_NM, " +
    "   (SELECT  CAR_NM FROM TB_CAR  WHERE CAR_CODE = MCR_LCD) as MCR_LCD_NM, " +
    "   (SELECT  CAR_NM FROM TB_CAR  WHERE CAR_CODE = c.MCR_SCD) as MCR_SCD_NM, " +
    "   (SELECT  MEM_SURVEY_YN FROM TB_MEMBER as m  WHERE m.MEM_ID = ?) as MEM_SURVEY_YN, " +
    "   IFNULL((SELECT CLICK_NUM FROM TB_CLICK WHERE PROD_ID = c.MCR_ID), 0) as CLICK_NUM, " +
    "   c.MCR_TON, " +
    "   c.MCR_ADDR1_NM, " +
    "   c.MCR_ADDR2_NM, " +
    "   FORMAT(c.MCR_KM,0) as MCR_KM, " +
    "   FORMAT(c.MCR_PRICE,0) as MCR_PRICE ";

  values.push(params.USR_ID);

  query += " FROM ";
  query += "   TB_MYCAR as c ";
  query += " LEFT OUTER JOIN TB_DEALER as d ";
  query += " ON c.DAL_ID = d.DAL_ID ";
  query += " WHERE ";
  query +=
    "   FIND_IN_SET(c.MCR_ID, (SELECT m.MEM_REC_CAR FROM TB_MEMBER as m WHERE m.MEM_ID = ?)) ";
  query += " AND c.MCR_STATE = 'C' ";
  query += " LIMIT 4 ";
  values.push(params.USR_ID);

  async.waterfall(
    [
      function (done) {
        db.select(query, values, function (err, results) {
          done(err, results);
        });
      },
    ],
    function (err, results) {
      if (err) {
        res.json({ code: 500, message: "#### [ERROR] : ", data: [err] });
      } else {
        res.json({ code: 200, message: "", data: results });
      }
    }
  );
});

router.get("/carRecommendationPage", function (req, res, next) {
  let params = req.query;
  let values = [];

  if (!params.PAGE)
    return res.json({ code: 412, message: "PAGE 입력해 주세요!", data: [] });
  if (!params.USR_ID)
    return res.json({ code: 412, message: "USR_ID 입력해 주세요!", data: [] });
  if (!params.USR_TYPE)
    return res.json({
      code: 412,
      message: "USR_TYPE 입력해 주세요!",
      data: [],
    });

  //페이징 적용을 위한 변수
  let pageNumber = params.PAGE;
  let pageSize = 16;
  let firstRow = (pageNumber - 1) * pageSize;
  let lastRow = pageSize;

  let query =
    " SELECT " +
    "   d.DAL_IMG, " +
    "   d.DAL_BEST_YN, " +
    "   d.DAL_NAME,  " +
    "   d.DAL_ID, " +
    "   c.MCR_REAL_YN, " +
    "   c.MCR_AD_YN, " +
    "   c.MCR_ID, " +
    "   c.MCR_IMG1, " +
    "   c.MCR_LCD, " +
    "   c.MCR_YEAR_MM, " +
    "   c.MCR_ETC_NM, " +
    "   c.MCR_UPT_DT, " +
    "   '' as MCR_THUM, " +
    "   c.MCR_SCD_SNM, " +
    "   (SELECT  CAR_NM FROM TB_CAR  WHERE CAR_CODE = MCR_BRAND_CD) as MCR_BRAND_NM, " +
    "   (SELECT  CAR_NM FROM TB_CAR  WHERE CAR_CODE = MCR_MODEL_CD) as MCR_MODEL_NM, " +
    "   (SELECT  CAR_NM FROM TB_CAR  WHERE CAR_CODE = MCR_LCD) as MCR_LCD_NM, " +
    "   (SELECT  CAR_NM FROM TB_CAR  WHERE CAR_CODE = c.MCR_SCD) as MCR_SCD_NM, " +
    "   (SELECT  MEM_SURVEY_YN FROM TB_MEMBER as m  WHERE m.MEM_ID = ?) as MEM_SURVEY_YN, " +
    "   IFNULL((SELECT CLICK_NUM FROM TB_CLICK WHERE PROD_ID = c.MCR_ID), 0) as CLICK_NUM, " +
    "   c.MCR_TON, " +
    "   c.MCR_ADDR1_NM, " +
    "   c.MCR_ADDR2_NM, " +
    "   FORMAT(c.MCR_KM,0) as MCR_KM, " +
    "   FORMAT(c.MCR_PRICE,0) as MCR_PRICE ";

  values.push(params.USR_ID);

  query += " FROM ";
  query += "   TB_MYCAR as c ";
  query += " LEFT OUTER JOIN TB_DEALER as d ";
  query += " ON c.DAL_ID = d.DAL_ID ";
  query += " WHERE ";
  query +=
    "   FIND_IN_SET(c.MCR_ID, (SELECT m.MEM_REC_CAR FROM TB_MEMBER as m WHERE m.MEM_ID = ?)) ";
  query += " AND c.MCR_STATE = 'C' ";
  query += " LIMIT ?, ? ";
  values.push(params.USR_ID);
  values.push(firstRow);
  values.push(lastRow);

  async.waterfall(
    [
      function (done) {
        db.select(query, values, function (err, results) {
          done(err, results);
        });
      },
    ],
    function (err, results) {
      if (err) {
        res.json({ code: 500, message: "#### [ERROR] : ", data: [err] });
      } else {
        res.json({ code: 200, message: "", data: results });
      }
    }
  );
});

// User물량, 설문 filtering
router.post("/recommend", function (req, res, next) {
  let params = req.body;
  let req_params = [
    "usr_id",
    "usr_type",
    "main",
    "item",
    "pkg",
    "ton",
    "brand",
    "reliability_q1",
    "reliability_q2",
    "reliability_q3",
    "reliability_q4",
    "reliability_q5",
    "condition_q1",
    "condition_q2",
    "condition_q3",
    "condition_q4",
    "asset_q1",
    "asset_q2",
    "asset_q3",
  ];
  let pythonParams = [
    "./pythons/main.py",
    "post_recommendation",
    process.env.MYSQL_DEV_USER,
    process.env.MYSQL_DEV_PWD,
  ];

  if (!params.usr_id) {
    return res.json({
      code: 201,
      message: "USR_ID 입력해 주세요!",
      data: [],
    });
  }
  if (!params.usr_type) {
    return res.json({
      code: 201,
      message: "USR_TYPE 입력해 주세요!",
      data: [],
    });
  }
  if (
    params.usr_type != "MEM" &&
    params.usr_type != "DAL" &&
    params.usr_type != "COM"
  ) {
    return res.json({
      code: 412,
      message: "USR_TYPE(MEM/DAL/COM) 입력해 주세요!",
      data: [],
    });
  }
  const obj = require("../assets/json/Recommendation_json/GROUP_USER.json");

  let main_arr = [];
  let item_arr = [];
  let pkg_arr = [];
  let group = "";
  let group2 = "";
  if (!params.main) {
    for (const [key, value] of Object.entries(obj)) {
      main_arr.push(value.main);
    }
    main_arr = main_arr.flat();
    main_arr = main_arr.filter((element, index) => {
      return main_arr.indexOf(element) === index;
    });
    return res.json({
      code: 201,
      message: "main 입력해 주세요!",
      data: main_arr,
    });
  } else if (!params.item) {
    for (const [key, value] of Object.entries(obj)) {
      if (value.main.includes(params.main)) {
        item_arr.push(value.item);
      }
    }
    item_arr = item_arr.flat();
    item_arr = item_arr.filter((element, index) => {
      return item_arr.indexOf(element) === index;
    });
    return res.json({
      code: 201,
      message: "item 입력해 주세요!",
      data: item_arr,
    });
  } else if (params.main === "기타" && params.item === "기타") {
    group = "GROUP22";
  } else if (
    (params.main === "건설, 건축" || params.main === "특수목적") &&
    (params.item === "간판 및 고소 작업" || params.item === "외벽 및 고소 작업")
  ) {
    group = "GROUP48";
  } else if (!params.pkg) {
    for (const [key, value] of Object.entries(obj)) {
      if (
        value.main.includes(params.main) &&
        value.item.includes(params.item)
      ) {
        pkg_arr.push(value.pkg);
      }
    }
    pkg_arr = pkg_arr.flat();
    pkg_arr = pkg_arr.filter((element, index) => {
      return pkg_arr.indexOf(element) === index;
    });
    return res.json({
      code: 201,
      message: "pkg 입력해 주세요!",
      data: pkg_arr,
    });
  }
  for (const [key, value] of Object.entries(obj)) {
    if (
      value.main.includes(params.main) &&
      value.item.includes(params.item) &&
      value.pkg.includes(params.pkg)
    ) {
      group = key;
      break;
    }
  }
  if (!group) {
    return res.json({
      code: 412,
      message: "항목을 다시 확인해주세요!",
      data: [],
    });
  }
  // group filtering
  const converter =
    require("../assets/json/Recommendation_json/GROUP_TREE.json")[group];

  let where = " WHERE m.MCR_STATE = 'C' AND d.DAL_STATE = '0801' ";

  let scd = [];

  for (const [key, value] of Object.entries(converter.CATEGORY)) {
    value.forEach(function (v) {
      scd.push(key + v);
    });
  }
  if (scd.length > 0) {
    where += "AND ( ";
    scd.forEach(function (value, i) {
      if (i + 1 != scd.length) {
        where += `m.MCR_SCD like "_${value}_______" OR `;
      } else {
        where += `m.MCR_SCD like "_${value}_______" `;
      }
      console.log(value);
    });
    where += " )";
  }

  if (converter.TB_MYCAR_OPTION) {
    where += " AND  ( ";
    converter.TB_MYCAR_OPTION.forEach(function (value, i) {
      if (i + 1 != converter.TB_MYCAR_OPTION.length) {
        where += `op.${value} = 1 OR `;
      } else {
        where += `op.${value} = 1 `;
      }
    });
    where += " ) ";
  }

  if (converter.MCR_AXLE) {
    where += " AND m.MCR_AXLE IN ( ";
    converter.MCR_AXLE.forEach(function (value, i) {
      where += `'${value}' `;
      if (i + 1 != converter.MCR_AXLE.length) {
        where += ", ";
      }
    });
    where += ") ";
  }

  if (converter.MCR_WING_TOP) {
    where += " AND m.MCR_WING_TOP IN ( ";
    converter.MCR_WING_TOP.forEach(function (value, i) {
      where += `'${value}' `;
      if (i + 1 != converter.MCR_WING_TOP.length) {
        where += ", ";
      }
    });
    where += ") ";
  }

  // question parms
  const qt = require("../assets/json/Recommendation_json/question.json");

  let ton_arr = [];
  let brand_arr = [];
  let reliability_arr1 = [];
  let reliability_arr2 = [];
  let reliability_arr3 = [];
  let reliability_arr4 = [];
  let reliability_arr5 = [];
  let condition_arr1 = [];
  let condition_arr2 = [];
  let condition_arr3 = [];
  let condition_arr4 = [];
  let asset_arr1 = [];
  let asset_arr2 = [];
  let asset_arr3 = [];
  let user_points = [];
  if (!params.ton) {
    for (const [key, value] of Object.entries(qt.TON.TON_Q1.QUESTION_NUMBER)) {
      ton_arr.push(value);
    }
    return res.json({
      code: 201,
      message: "원하는 톤 수를 알려주세요",
      data: ton_arr,
    });
  }
  if (!params.brand) {
    for (const [key, value] of Object.entries(
      qt.BRAND.BRAND_Q1.QUESTION_NUMBER
    )) {
      brand_arr.push(value);
    }
    return res.json({
      code: 201,
      message: "국산차와 외제차 중 구매하고 싶은 쪽을 알려주세요",
      data: brand_arr,
    });
  }
  if (!params.reliability_q1) {
    for (const [key, value] of Object.entries(
      qt.RELIABILITY.RELIABILITY_Q1.QUESTION_NUMBER
    )) {
      reliability_arr1.push(value);
    }
    return res.json({
      code: 201,
      message: "실매물 확인된 차량을 원하시나요?",
      data: reliability_arr1,
    });
  }
  if (!params.reliability_q2) {
    for (const [key, value] of Object.entries(
      qt.RELIABILITY.RELIABILITY_Q2.QUESTION_NUMBER
    )) {
      reliability_arr2.push(value);
    }
    return res.json({
      code: 201,
      message: "종사원증 번호가 있는 딜러의 차량을 원하시나요?",
      data: reliability_arr2,
    });
  }
  if (!params.reliability_q3) {
    for (const [key, value] of Object.entries(
      qt.RELIABILITY.RELIABILITY_Q3.QUESTION_NUMBER
    )) {
      reliability_arr3.push(value);
    }
    return res.json({
      code: 201,
      message: "일평균 등록 매물이 많은 딜러의 차량을 원하시나요?",
      data: reliability_arr3,
    });
  }
  if (!params.reliability_q4) {
    for (const [key, value] of Object.entries(
      qt.RELIABILITY.RELIABILITY_Q4.QUESTION_NUMBER
    )) {
      reliability_arr4.push(value);
    }
    return res.json({
      code: 201,
      message: "헛걸음 보상 제공이 되는 딜러의 차량을 원하시나요?",
      data: reliability_arr4,
    });
  }
  if (!params.reliability_q5) {
    for (const [key, value] of Object.entries(
      qt.RELIABILITY.RELIABILITY_Q5.QUESTION_NUMBER
    )) {
      reliability_arr5.push(value);
    }
    return res.json({
      code: 201,
      message: "아이트럭에서 정비 상태를 보장하는 인증 차량을 원하시나요?",
      data: reliability_arr5,
    });
  }
  if (!params.condition_q1) {
    for (const [key, value] of Object.entries(
      qt.CONDITION.CONDITION_Q1.QUESTION_NUMBER
    )) {
      condition_arr1.push(value);
    }
    return res.json({
      code: 201,
      message: "차량의 주행거리가 높아도 괜찮으신가요?",
      data: condition_arr1,
    });
  }
  if (!params.condition_q2) {
    for (const [key, value] of Object.entries(
      qt.CONDITION.CONDITION_Q2.QUESTION_NUMBER
    )) {
      condition_arr2.push(value);
    }
    return res.json({
      code: 201,
      message: "차량 상태가 좋다면 가격이 조금 비싸도 괜찮으신가요?",
      data: condition_arr2,
    });
  }
  if (!params.condition_q3) {
    for (const [key, value] of Object.entries(
      qt.CONDITION.CONDITION_Q3.QUESTION_NUMBER
    )) {
      condition_arr3.push(value);
    }
    return res.json({
      code: 201,
      message: "차량 설명을 자세하게 보고 싶나요?",
      data: condition_arr3,
    });
  }
  if (!params.condition_q4) {
    for (const [key, value] of Object.entries(
      qt.CONDITION.CONDITION_Q4.QUESTION_NUMBER
    )) {
      condition_arr4.push(value);
    }
    return res.json({
      code: 201,
      message: "차량마다 자세한 사진을 보고 싶으신가요?",
      data: condition_arr4,
    });
  }
  if (!params.asset_q1) {
    for (const [key, value] of Object.entries(
      qt.ASSET.ASSET_Q1.QUESTION_NUMBER
    )) {
      asset_arr1.push(value);
    }
    return res.json({
      code: 201,
      message: "직거래 차량을 원하시나요?",
      data: asset_arr1,
    });
  }
  if (!params.asset_q2) {
    for (const [key, value] of Object.entries(
      qt.ASSET.ASSET_Q2.QUESTION_NUMBER
    )) {
      asset_arr2.push(value);
    }
    return res.json({
      code: 201,
      message: "하루에 보통 몇 시간 일할 예정이신가요?",
      data: asset_arr2,
    });
  }
  if (!params.asset_q3) {
    for (const [key, value] of Object.entries(
      qt.ASSET.ASSET_Q3.QUESTION_NUMBER
    )) {
      asset_arr3.push(value);
    }
    return res.json({
      code: 201,
      message: "한 달에 보통 며칠을 일할 예정이신가요?",
      data: asset_arr3,
    });
  }
  user_points.push(
    params.ton,
    params.brand,
    params.reliability_q1,
    params.reliability_q2,
    params.reliability_q3,
    params.reliability_q4,
    params.reliability_q5,
    params.condition_q1,
    params.condition_q2,
    params.condition_q3,
    params.condition_q4,
    params.asset_q1,
    params.asset_q2,
    params.asset_q3
  );

  pythonParams.push(where);
  pythonParams.push(user_points);
  let recommendation = "recommendation";
  async.waterfall([
    function (done) {
      const spawn = require("child_process").spawn;
      const result = spawn("python3", pythonParams);
      result.stdout.on("data", function (data) {
        reclist = data.toString().split(",");
        rec_car_id_1 = reclist.slice(0, 1);
        rec_car_id_2 = reclist.slice(1, 2);
        rec_car_id_3 = reclist.slice(2, 3);
        rec_car_id_4 = reclist.slice(3, 4);
        rec_car_id_5 = reclist.slice(4, 5);
        rec_car_id_6 = reclist.slice(5, 6);

        async.waterfall(
          [
            function (results) {
              //DB 파라메터 구성
              let rec_sqlParams = [
                recommendation,
                {
                  REC_USR_ID: params.usr_id,
                  REC_MAIN: params.main,
                  REC_ITEM: params.item,
                  REC_PKG: params.pkg,
                  REC_TON: params.ton,
                  REC_BRAND: params.brand,
                  REC_ITEM: params.item,
                  REC_RELIABILITY_Q1: params.reliability_q1,
                  REC_RELIABILITY_Q2: params.reliability_q2,
                  REC_RELIABILITY_Q3: params.reliability_q3,
                  REC_RELIABILITY_Q4: params.reliability_q4,
                  REC_RELIABILITY_Q5: params.reliability_q5,
                  REC_CONDITION_Q1: params.condition_q1,
                  REC_CONDITION_Q2: params.condition_q2,
                  REC_CONDITION_Q3: params.condition_q3,
                  REC_CONDITION_Q4: params.condition_q4,
                  REC_ASSET_Q1: params.asset_q1,
                  REC_ASSET_Q2: params.asset_q2,
                  REC_ASSET_Q3: params.asset_q3,
                  REC_CAR_ID_1: rec_car_id_1,
                  REC_CAR_ID_2: rec_car_id_2,
                  REC_CAR_ID_3: rec_car_id_3,
                  REC_CAR_ID_4: rec_car_id_4,
                  REC_CAR_ID_5: rec_car_id_5,
                  REC_CAR_ID_6: rec_car_id_6,
                  REC_USR_TYPE: params.usr_type,
                },
              ];
              db.exec(
                "INSERT INTO ?? SET ? ",
                rec_sqlParams,
                function (err, result) {
                  results(err, result);
                }
              );
            },
          ],
          function (err) {
            if (err) {
              res.json({ code: 500, message: "실패", data: [] });
            } else {
              res.json({ code: 200, message: "성공", data: [] });
            }
          }
        );
      });
    },
  ]);
});

module.exports = router;
