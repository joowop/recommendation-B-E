let express = require("express");
let router = express.Router();
let async = require("async");
let db = require("../lib/connection");
let comm = require("../lib/common.js");
const { RandomizeList } = require("../models");

router.post("/recommend", function (req, res, next) {
  let params = req.body;
  let req_params = [
    "A_main",
    "B_item",
    "C_pkg",
    "D_ton",
    "E_brand",
    "F_reliability_q1",
    "G_reliability_q2",
    "H_reliability_q3",
    "I_reliability_q4",
    "G_reliability_q5",
    "K_condition_q1",
    "L_condition_q2",
    "M_condition_q3",
    "N_condition_q4",
    "O_asset_q1",
    "P_asset_q2",
    "Q_asset_q3",
  ];
  let pythonParams = [
    "./pythons/main.py",
    "post_recommendation",
    process.env.MYSQL_DEV_USER,
    process.env.MYSQL_DEV_PWD,
  ];

  const obj = require("../assets/json/Recommendation_json/GROUP_USER.json");

  let main_arr = [];
  let item_arr = [];
  let pkg_arr = [];
  let group = "";

  if (!params.A_main) {
    for (const [key, value] of Object.entries(obj)) {
      main_arr.push(value.main);
    }
    main_arr = main_arr.flat();
    main_arr = main_arr.filter((element, index) => {
      return main_arr.indexOf(element) === index;
    });
    let zipArrays = (keysArray, valuesArray) =>
      Object.fromEntries(
        keysArray.map((value, index) => [value, valuesArray[index]])
      );

    let langKeys = zipArrays(main_arr, main_arr);
    answer_key = "A_main";

    return res.json({
      view: langKeys,
      type: "drop_down",
      answer_key: answer_key,
      code: 201,
      message: "운송하는 주요 물류를 알려주세요",
      data: main_arr,
    });
  } else if (!params.B_item) {
    for (const [key, value] of Object.entries(obj)) {
      if (value.main.includes(params.A_main)) {
        item_arr.push(value.item);
      }
    }
    item_arr = item_arr.flat();
    item_arr = item_arr.filter((element, index) => {
      return item_arr.indexOf(element) === index;
    });
    let zipArrays = (keysArray, valuesArray) =>
      Object.fromEntries(
        keysArray.map((value, index) => [value, valuesArray[index]])
      );

    let langKeys = zipArrays(item_arr, item_arr);
    answer_key = "B_item";
    return res.json({
      view: langKeys,
      type: "drop_down",
      answer_key: answer_key,
      code: 201,
      message: "세부물류를 알려주세요",
      data: item_arr,
    });
  } else if (params.A_main === "기타" && params.B_item === "기타") {
    group = "GROUP22";
  } else if (
    (params.A_main === "건설, 건축" || params.A_main === "특수목적") &&
    (params.B_item === "간판 및 고소 작업" ||
      params.B_item === "외벽 및 고소 작업")
  ) {
    group = "GROUP48";
  } else if (!params.C_pkg) {
    for (const [key, value] of Object.entries(obj)) {
      if (
        value.main.includes(params.A_main) &&
        value.item.includes(params.B_item)
      ) {
        pkg_arr.push(value.pkg);
      }
    }
    pkg_arr = pkg_arr.flat();
    pkg_arr = pkg_arr.filter((element, index) => {
      return pkg_arr.indexOf(element) === index;
    });
    let zipArrays = (keysArray, valuesArray) =>
      Object.fromEntries(
        keysArray.map((value, index) => [value, valuesArray[index]])
      );

    let langKeys = zipArrays(pkg_arr, pkg_arr);
    answer_key = "C_pkg";
    return res.json({
      view: langKeys,
      type: "drop_down",
      answer_key: answer_key,
      code: 201,
      message: "세부 물류의 적재 방식을 알려주세요",
      data: pkg_arr,
    });
  }
  for (const [key, value] of Object.entries(obj)) {
    if (
      value.main.includes(params.A_main) &&
      value.item.includes(params.B_item) &&
      value.pkg.includes(params.C_pkg)
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
  let ton_view = [];
  let brand_view = [];
  let reliability_view1 = [];
  let reliability_view2 = [];
  let reliability_view3 = [];
  let reliability_view4 = [];
  let reliability_view5 = [];
  let condition_view1 = [];
  let condition_view2 = [];
  let condition_view3 = [];
  let condition_view4 = [];
  let asset_view1 = [];
  let asset_view2 = [];
  let asset_view3 = [];

  if (!params.D_ton) {
    for (const [key, value] of Object.entries(
      qt.TON.TON_Q1.QUEST.QUESTION_NUMBER
    )) {
      ton_arr.push(value);
    }
    for (const [key, value] of Object.entries(
      qt.TON.TON_Q1.QUEST.QUESTION_VIEW
    )) {
      ton_view.push(value);
    }
    let zipArrays = (keysArray, valuesArray) =>
      Object.fromEntries(
        keysArray.map((value, index) => [value, valuesArray[index]])
      );

    let langKeys = zipArrays(ton_view, ton_arr);
    answer_key = "D_ton";
    return res.json({
      view: langKeys,
      type: "drop_down",
      answer_key: answer_key,
      code: 201,
      message: "원하는 톤 수를 알려주세요",
      data: ton_arr,
    });
  }
  if (!params.E_brand) {
    for (const [key, value] of Object.entries(
      qt.BRAND.BRAND_Q1.QUEST.QUESTION_NUMBER
    )) {
      brand_arr.push(value);
    }
    for (const [key, value] of Object.entries(
      qt.BRAND.BRAND_Q1.QUEST.QUESTION_VIEW
    )) {
      brand_view.push(value);
    }
    let zipArrays = (keysArray, valuesArray) =>
      Object.fromEntries(
        keysArray.map((value, index) => [value, valuesArray[index]])
      );

    let langKeys = zipArrays(brand_view, brand_arr);
    answer_key = "E_brand";
    return res.json({
      view: langKeys,
      type: "drop_down",
      answer_key: answer_key,
      code: 201,
      message: "국산차와 외제차 중 구매하고 싶은 쪽을 알려주세요",
      data: brand_arr,
    });
  }
  if (!params.F_reliability_q1) {
    for (const [key, value] of Object.entries(
      qt.RELIABILITY.RELIABILITY_Q1.QUEST.QUESTION_NUMBER
    )) {
      reliability_arr1.push(value);
    }
    for (const [key, value] of Object.entries(
      qt.RELIABILITY.RELIABILITY_Q1.QUEST.QUESTION_VIEW
    )) {
      reliability_view1.push(value);
    }
    let zipArrays = (keysArray, valuesArray) =>
      Object.fromEntries(
        keysArray.map((value, index) => [value, valuesArray[index]])
      );

    let langKeys = zipArrays(reliability_view1, reliability_arr1);
    answer_key = "F_reliability_q1";
    return res.json({
      view: langKeys,
      type: "drop_down",
      answer_key: answer_key,
      code: 201,
      message: "실매물 확인된 차량을 원하시나요?",
      data: reliability_arr1,
    });
  }
  if (!params.G_reliability_q2) {
    for (const [key, value] of Object.entries(
      qt.RELIABILITY.RELIABILITY_Q2.QUEST.QUESTION_NUMBER
    )) {
      reliability_arr2.push(value);
    }
    for (const [key, value] of Object.entries(
      qt.RELIABILITY.RELIABILITY_Q2.QUEST.QUESTION_VIEW
    )) {
      reliability_view2.push(value);
    }
    let zipArrays = (keysArray, valuesArray) =>
      Object.fromEntries(
        keysArray.map((value, index) => [value, valuesArray[index]])
      );

    let langKeys = zipArrays(reliability_view2, reliability_arr2);
    answer_key = "G_reliability_q2";
    return res.json({
      view: langKeys,
      type: "drop_down",
      answer_key: answer_key,
      code: 201,
      message: "종사원증 번호가 있는 딜러의 차량을 원하시나요?",
      data: reliability_arr2,
    });
  }
  if (!params.H_reliability_q3) {
    for (const [key, value] of Object.entries(
      qt.RELIABILITY.RELIABILITY_Q3.QUEST.QUESTION_NUMBER
    )) {
      reliability_arr3.push(value);
    }
    for (const [key, value] of Object.entries(
      qt.RELIABILITY.RELIABILITY_Q3.QUEST.QUESTION_VIEW
    )) {
      reliability_view3.push(value);
    }
    let zipArrays = (keysArray, valuesArray) =>
      Object.fromEntries(
        keysArray.map((value, index) => [value, valuesArray[index]])
      );

    let langKeys = zipArrays(reliability_view3, reliability_arr3);
    answer_key = "H_reliability_q3";
    return res.json({
      view: langKeys,
      type: "drop_down",
      answer_key: answer_key,
      code: 201,
      message: "일평균 등록 매물이 많은 딜러의 차량을 원하시나요?",
      data: reliability_arr3,
    });
  }
  if (!params.I_reliability_q4) {
    for (const [key, value] of Object.entries(
      qt.RELIABILITY.RELIABILITY_Q4.QUEST.QUESTION_NUMBER
    )) {
      reliability_arr4.push(value);
    }
    for (const [key, value] of Object.entries(
      qt.RELIABILITY.RELIABILITY_Q4.QUEST.QUESTION_VIEW
    )) {
      reliability_view4.push(value);
    }
    let zipArrays = (keysArray, valuesArray) =>
      Object.fromEntries(
        keysArray.map((value, index) => [value, valuesArray[index]])
      );

    let langKeys = zipArrays(reliability_view4, reliability_arr4);
    answer_key = "I_reliability_q4";
    return res.json({
      view: langKeys,
      type: "drop_down",
      answer_key: answer_key,
      code: 201,
      message: "헛걸음 보상 제공이 되는 딜러의 차량을 원하시나요?",
      data: reliability_arr4,
    });
  }
  if (!params.J_reliability_q5) {
    for (const [key, value] of Object.entries(
      qt.RELIABILITY.RELIABILITY_Q5.QUEST.QUESTION_NUMBER
    )) {
      reliability_arr5.push(value);
    }
    for (const [key, value] of Object.entries(
      qt.RELIABILITY.RELIABILITY_Q5.QUEST.QUESTION_VIEW
    )) {
      reliability_view5.push(value);
    }
    let zipArrays = (keysArray, valuesArray) =>
      Object.fromEntries(
        keysArray.map((value, index) => [value, valuesArray[index]])
      );

    let langKeys = zipArrays(reliability_view5, reliability_arr5);
    answer_key = "J_reliability_q5";
    return res.json({
      view: langKeys,
      type: "drop_down",
      answer_key: answer_key,
      code: 201,
      message: "아이트럭에서 정비 상태를 보장하는 인증 차량을 원하시나요?",
      data: reliability_arr5,
    });
  }
  if (!params.K_condition_q1) {
    for (const [key, value] of Object.entries(
      qt.CONDITION.CONDITION_Q1.QUEST.QUESTION_NUMBER
    )) {
      condition_arr1.push(value);
    }
    for (const [key, value] of Object.entries(
      qt.CONDITION.CONDITION_Q1.QUEST.QUESTION_VIEW
    )) {
      condition_view1.push(value);
    }
    let zipArrays = (keysArray, valuesArray) =>
      Object.fromEntries(
        keysArray.map((value, index) => [value, valuesArray[index]])
      );

    let langKeys = zipArrays(condition_view1, condition_arr1);
    answer_key = "K_condition_q1";
    return res.json({
      view: langKeys,
      type: "drop_down",
      answer_key: answer_key,
      code: 201,
      message: "차량의 주행거리가 높아도 괜찮으신가요?",
      data: condition_arr1,
    });
  }
  if (!params.L_condition_q2) {
    for (const [key, value] of Object.entries(
      qt.CONDITION.CONDITION_Q2.QUEST.QUESTION_NUMBER
    )) {
      condition_arr2.push(value);
    }
    for (const [key, value] of Object.entries(
      qt.CONDITION.CONDITION_Q2.QUEST.QUESTION_VIEW
    )) {
      condition_view2.push(value);
    }
    let zipArrays = (keysArray, valuesArray) =>
      Object.fromEntries(
        keysArray.map((value, index) => [value, valuesArray[index]])
      );

    let langKeys = zipArrays(condition_view2, condition_arr2);
    answer_key = "L_condition_q2";
    return res.json({
      view: langKeys,
      type: "drop_down",
      answer_key: answer_key,
      code: 201,
      message: "차량 상태가 좋다면 가격이 조금 비싸도 괜찮으신가요?",
      data: condition_arr2,
    });
  }
  if (!params.M_condition_q3) {
    for (const [key, value] of Object.entries(
      qt.CONDITION.CONDITION_Q3.QUEST.QUESTION_NUMBER
    )) {
      condition_arr3.push(value);
    }
    for (const [key, value] of Object.entries(
      qt.CONDITION.CONDITION_Q3.QUEST.QUESTION_VIEW
    )) {
      condition_view3.push(value);
    }
    let zipArrays = (keysArray, valuesArray) =>
      Object.fromEntries(
        keysArray.map((value, index) => [value, valuesArray[index]])
      );

    let langKeys = zipArrays(condition_view3, condition_arr3);
    answer_key = "M_condition_q3";
    return res.json({
      view: langKeys,
      type: "drop_down",
      answer_key: answer_key,
      code: 201,
      message: "차량 설명을 자세하게 보고 싶나요?",
      data: condition_arr3,
    });
  }
  if (!params.N_condition_q4) {
    for (const [key, value] of Object.entries(
      qt.CONDITION.CONDITION_Q4.QUEST.QUESTION_NUMBER
    )) {
      condition_arr4.push(value);
    }
    for (const [key, value] of Object.entries(
      qt.CONDITION.CONDITION_Q4.QUEST.QUESTION_VIEW
    )) {
      condition_view4.push(value);
    }
    let zipArrays = (keysArray, valuesArray) =>
      Object.fromEntries(
        keysArray.map((value, index) => [value, valuesArray[index]])
      );

    let langKeys = zipArrays(condition_view4, condition_arr4);
    answer_key = "N_condition_q4";
    return res.json({
      view: langKeys,
      type: "drop_down",
      answer_key: answer_key,
      code: 201,
      message: "차량마다 자세한 사진을 보고 싶으신가요?",
      data: condition_arr4,
    });
  }
  if (!params.O_asset_q1) {
    for (const [key, value] of Object.entries(
      qt.ASSET.ASSET_Q1.QUEST.QUESTION_NUMBER
    )) {
      asset_arr1.push(value);
    }
    for (const [key, value] of Object.entries(
      qt.ASSET.ASSET_Q1.QUEST.QUESTION_VIEW
    )) {
      asset_view1.push(value);
    }
    let zipArrays = (keysArray, valuesArray) =>
      Object.fromEntries(
        keysArray.map((value, index) => [value, valuesArray[index]])
      );

    let langKeys = zipArrays(asset_view1, asset_arr1);
    answer_key = "O_asset_q1";
    return res.json({
      view: langKeys,
      type: "drop_down",
      answer_key: answer_key,
      code: 201,
      message: "직거래 차량을 원하시나요?",
      data: asset_arr1,
    });
  }
  if (!params.P_asset_q2) {
    for (const [key, value] of Object.entries(
      qt.ASSET.ASSET_Q2.QUEST.QUESTION_NUMBER
    )) {
      asset_arr2.push(value);
    }
    for (const [key, value] of Object.entries(
      qt.ASSET.ASSET_Q2.QUEST.QUESTION_VIEW
    )) {
      asset_view2.push(value);
    }
    let zipArrays = (keysArray, valuesArray) =>
      Object.fromEntries(
        keysArray.map((value, index) => [value, valuesArray[index]])
      );

    let langKeys = zipArrays(asset_view2, asset_arr2);
    answer_key = "P_asset_q2";
    return res.json({
      view: langKeys,
      type: "drop_down",
      answer_key: answer_key,
      code: 201,
      message: "하루에 보통 몇 시간 일할 예정이신가요?",
      data: asset_arr2,
    });
  }
  if (!params.Q_asset_q3) {
    for (const [key, value] of Object.entries(
      qt.ASSET.ASSET_Q3.QUEST.QUESTION_NUMBER
    )) {
      asset_arr3.push(value);
    }
    for (const [key, value] of Object.entries(
      qt.ASSET.ASSET_Q3.QUEST.QUESTION_VIEW
    )) {
      asset_view3.push(value);
    }
    let zipArrays = (keysArray, valuesArray) =>
      Object.fromEntries(
        keysArray.map((value, index) => [value, valuesArray[index]])
      );

    let langKeys = zipArrays(asset_view3, asset_arr3);
    answer_key = "Q_asset_q3";
    return res.json({
      view: langKeys,
      type: "drop_down",
      answer_key: answer_key,
      code: 201,
      message: "한 달에 보통 며칠을 일할 예정이신가요?",
      data: asset_arr3,
    });
  }
  user_points.push(
    params.D_ton,
    params.E_brand,
    params.F_reliability_q1,
    params.G_reliability_q2,
    params.H_reliability_q3,
    params.I_reliability_q4,
    params.J_reliability_q5,
    params.K_condition_q1,
    params.L_condition_q2,
    params.M_condition_q3,
    params.N_condition_q4,
    params.O_asset_q1,
    params.P_asset_q2,
    params.Q_asset_q3
  );
  pythonParams.push(where);
  pythonParams.push(user_points);
  let itruck_dealer = process.env.ITRUCK_DEALER;
  async.waterfall(
    [
      function (done) {
        const spawn = require("child_process").spawn;
        const result = spawn("python", pythonParams);
        result.stdout.on("data", function (data) {
          reclist = data.toString().split(",");
          let values = [];
          let where = "";
          let query =
            " SELECT " +
            "   s.DAL_IMG, " +
            "   s.DAL_BEST_YN, " +
            "   s.DAL_NAME,  " +
            "   m.DAL_ID, " +
            "   m.MCR_LCD, " +
            "   m.MCR_SCD, " +
            "   m.MCR_BRAND_CD, " +
            "   m.MCR_MODEL_CD, " +
            "   m.MCR_WING_TOP, " +
            "   m.MCR_YEAR_MM, " +
            "   IFNULL((SELECT CLICK_NUM FROM TB_CLICK WHERE PROD_ID = m.MCR_ID), 0) as CLICK_NUM, " +
            "   m.MCR_TON, " +
            "   m.MCR_ADDR1_NM, " +
            "   m.MCR_ADDR2_NM, " +
            "   m.MCR_TKJANG, " +
            "   m.MCR_LOADER_LEN, " +
            "   m.MCR_LOADER_WID, " +
            "   m.MCR_LOADER_HGT, " +
            "   m.MCR_TRM, " +
            "   m.MCR_HP, " +
            "   m.MCR_AXLE, " +
            "   m.MCR_REAL_YN, " +
            "   m.MCR_STATE, " +
            "   m.MCR_AD_YN, " +
            "   m.MCR_ID, " +
            "   m.MCR_IMG1, " +
            "   p.MPN_EXT_WID, " +
            "   p.MPN_EXT_SUB, " +
            "   p.MPN_SFE_RET, " +
            "   FORMAT(m.MCR_KM,0) as MCR_KM, " +
            "   FORMAT(m.MCR_PRICE,0) as MCR_PRICE ";

          query += " FROM ";
          query += "   TB_MYCAR as m ";
          query += " LEFT OUTER JOIN TB_DEALER as s ";
          query += " ON m.DAL_ID = s.DAL_ID ";
          query += " LEFT OUTER JOIN TB_MYCAR_OPTION as p ";
          query += " ON m.MCR_ID = p.MCR_ID ";
          query += " WHERE ";
          query += ` m.MCR_ID IN (${reclist}) `;
          query += ` ORDER BY FIELD(m.MCR_ID, ${reclist}) `;
          where = comm.whereConcatenator(
            where,
            "m.MCR_STATE IN ('C') AND m.DAL_ID NOT IN(SELECT DAL_ID FROM TB_DEALER WHERE DAL_STATE = '0802') "
          );
          if (!params.is_dal) {
            where = comm.whereConcatenator(
              where,
              ` m.DAL_ID NOT IN (${itruck_dealer}) `
            );
          }
          db.select(query, values, function (err, results) {
            if (results) {
              results = comm.truckThumbnailConverter(
                results,
                params.is_dal,
                itruck_dealer.split(",")
              );
            } else {
              res.json({ code: 200, message: "", data: [] });
            }
            done(err, results);
          });
        });
        result.stderr.on("data", function (err) {
          console.log(err);
          done(err);
        });
      },
    ],
    function (err, results) {
      if (err) {
        res.json({ code: 500, message: "추천 매물이 없습니다.", data: [] });
        console.log(err);
      } else {
        res.json({ where: where, code: 200, message: "", data: results });
      }
    }
  );
});

module.exports = router;
