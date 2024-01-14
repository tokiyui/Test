var HOUR = 60 * 60 * 1000;
var DAY = 24 * HOUR;
var dat = {};
var points;
var ini;
var current_ini;
var current_amedas;
var amedas;
var pref;
var region;
var lonlat = {};
var fcst;
var filename;
var gsmgpv_point_url = "";
var msmgpv_point_url = "";
var lfmgpv_point_url = "";
var tmp = $.exDate();

window.onload = function () {
	gsmgpv_point_url = $("#a_gsmgpv_point").attr("href");
	msmgpv_point_url = $("#a_msmgpv_point").attr("href");
	lfmgpv_point_url = $("#a_lfmgpv_point").attr("href");
	// URL引数の取得
	var url = location.href;
	if (~url.indexOf('?')) {
		if (~url.indexOf('&')) { // 引数3個
			var params_ary = url.split("?")[1].split("&");
			for (var i = 0; i < params_ary.length; i++) {
				var ary = params_ary[i].split("=");
				if (ary[0] == "amedas") amedas = ary[1];
				if (ary[0] == "pref") pref = ary[1];
				if (ary[0] == "region") region = ary[1];
			}
		} else { // 引数1個
			amedas = url.split("?")[1].split("=")[1];
			pref = amedas.slice(0, 2);
			region = amedasToRegion(amedas);
		}
	} else { // 引数なし
		region = -1;
		pref = 1000 - 1;
		amedas = 44132;
	}
	filename = url.split("?")[0]
	filename = filename.substring(filename.lastIndexOf('/') + 1, filename.length);
	$.get("https://lab.weathermap.co.jp/GSMGPV_point/get_latest.php", function (timestr){
		latest = $.exDate(timestr, "yyyymmddhh"); // UTC
		ini = latest.toChar("yyyymmddhh24"); // UTC
		latest.setTime(latest.getTime() + 9 * HOUR); // UTC->JST
		iniobj = latest; // JST
		$("#datetimepicker").datetimepicker({
			value: latest.toChar("yyyy/mm/dd hh24:00"),
			lang: "ja",
			minDate: "2011/05/01",
			maxDate: latest.toChar("yyyy/mm/dd"),
			maxTimeOfMaxDate: latest.toChar("hh24:00"),
			allowTimes : ["03:00","09:00","15:00","21:00"],
			todayButton: false, // 押すとバグる
			onClose: function (ctime, input) {
				iniobj = ctime; // JST
				tmp.setTime(iniobj.getTime() - 9 * HOUR); // JST->UTC
				ini = tmp.toChar("yyyymmddhh24"); // UTC
				update();
			}, // onChangeDateTimeだと不具合を起こす
			yearStart: 2011,
			yearEnd: latest.toChar("yyyy"),
		});
		selectAmedas(region, pref, amedas);
	});
}

function amedasToRegion(amedas) {
	var amedas2 = amedas.slice(0, 2); // 上2桁
	if (amedas2 < 30) {
		return 0;
	} else if (amedas2 < 40) {
		return 1;
	} else if (amedas2 < 50) {
		return 2;
	} else if (amedas2 < 60) {
		return 3;
	} else if (amedas2 < 66) {
		return 4;
	} else if (amedas2 < 80) {
		return 5;
	} else if (amedas2 < 90) {
		return 6;
	} else if (amedas2 < 99) {
		return 7;
	}
}

var dist = new Array();
dist[-1] = [0, 0];
dist[0] = [0, 30];
dist[1] = [30, 40];
dist[2] = [40, 50];
dist[3] = [50, 60];
dist[4] = [60, 66];
dist[5] = [66, 80];
dist[6] = [80, 90];
dist[7] = [90, 99];

// amedas番号上二桁と都府県名の対応辞書
var pref_name = {
	11: "宗谷", 12: "上川", 13: "留萌", 14: "石狩", 15: "空知", 16: "後志", 17: "網走・北見・紋別",
	18: "根室", 19: "釧路", 20: "十勝", 21: "胆振", 22: "日高", 23: "渡島", 24: "檜山",
	31: "青森", 32: "秋田", 33: "岩手", 34: "宮城", 35: "山形", 36: "福島",
	40: "茨城", 41: "栃木", 42: "群馬", 43: "埼玉", 44: "東京", 45: "千葉", 46: "神奈川", 48: "長野", 49: "山梨",
	50: "静岡", 51: "愛知", 52: "岐阜", 53: "三重", 54: "新潟", 55: "富山", 56: "石川", 57: "福井",
	60: "滋賀", 61: "京都", 62: "大阪", 63: "兵庫", 64: "奈良", 65: "和歌山", 66: "岡山", 67: "広島", 68: "島根", 69: "鳥取",
	71: "徳島", 72: "香川", 73: "愛媛", 74: "高知",
	81: "山口", 82: "福岡", 83: "大分", 84: "長崎", 85: "佐賀", 86: "熊本", 87: "宮崎", 88: "鹿児島",
	91: "沖縄本島地方", 92: "大東島地方", 93: "宮古島地方", 94: "八重山地方"
};

var region_name = {
	0: "北海道", 1: "東北", 2: "関東甲信", 3: "東海北陸", 4: "近畿", 5: "中国・四国", 6: "九州", 7: "沖縄"
};

function selectRegion(region) {
	// region は -1:全国主要地点 0:北海道 ...
	// amedas は地点選択用に渡す（オプション）
	r = parseInt(region);
	$('#selectRegion').val(region);
	$('#selectPref').children().remove();
	$('#selectPref').append('<option value="' + String(r + 1000) + '">' + (r == -1 ? "全国" : "地方") + '主要地点</option>');
	Object.keys(pref_name).forEach(function (amedas2) {
		if (dist[r][0] <= amedas2 && amedas2 < dist[r][1]) {
			$('#selectPref').append('<option value="' + String(amedas2) + '">' + pref_name[amedas2] + '</option>');
		}
	});
	selectPref(r + 1000);
}

function selectPref(pref) {
	// pref は
	//   amedas番号上二桁の場合，対応する都府県
	//   region + 1000 で地方主要地点（1000-1=999で地方主要地点
	// amedas は地点選択用に渡す
	$('#selectPref').val(pref);
	$.ajax({
		type: 'GET',
		url: pref >= 999 ? "https://lab.weathermap.co.jp/GSMGPV_point/points.php?a=" + (pref - 1000) : "https://lab.weathermap.co.jp/GSMGPV_point/points.php?pref=" + pref,
		dataType: 'json',
		success: function (json) {
			points = json;
			$('#selectPoint').children().remove();
			Object.keys(points).forEach(function (a) {
				$('#selectPoint').append('<option value="' + a + '">' + points[a] + '</option>');
			});
		}
	});
}

function selectAmedas(region, pref, amedas) {
    r = parseInt(region);
    var query = "?amedas=" + amedas + "&region=" + region + "&pref=" + pref;
    history.pushState("", "", filename + query);
    $("#a_gsmgpv_point").attr("href", gsmgpv_point_url + query);
    $("#a_msmgpv_point").attr("href", msmgpv_point_url + query);
    $("#a_lfmgpv_point").attr("href", lfmgpv_point_url + query);

    $('#selectRegion').val(region);
    $('#selectPref').children().remove();
    $('#selectPref').append('<option value="' + String(r + 1000) + '">' + (r == -1 ? "全国" : "地方") + '主要地点</option>');
    Object.keys(pref_name).forEach(function (amedas2) {
        if (dist[r][0] <= amedas2 && amedas2 < dist[r][1]) {
            $('#selectPref').append('<option value="' + String(amedas2) + '">' + pref_name[amedas2] + '</option>');
        }
    });
    $('#selectPref').val(pref);

    $.when(
        $.ajax({
            type: 'GET',
            url: "https://lab.weathermap.co.jp/GSMGPV_point/points.php" + (pref >= 999 ? "?a=" + (pref - 1000) : "?pref=" + pref),
            dataType: 'json'
        }),
        $.ajax({
            type: 'GET',
            url: "https://lab.weathermap.co.jp/GSMGPV_point_ex/points.php" + (pref >= 999 ? "?a=" + (pref - 1000) : "?pref=" + pref),
            dataType: 'json'
        })
    ).done(function (gsmgpvData, gsmgpvExData) {
        points = Object.assign({}, gsmgpvData[0], gsmgpvExData[0]);
        $('#selectPoint').children().remove();
        Object.keys(points).forEach(function (a) {
            $('#selectPoint').append('<option value="' + a + '">' + points[a] + '</option>');
        });
        $('#selectPoint').val(amedas);
        update();
    });
}

function update() {
    var amedas = $("#selectPoint").val();
    var pref = $('#selectPref').val();
    var region = $('#selectRegion').val();
    if (current_ini === ini && current_amedas === amedas) { return; }
    current_ini = ini;
    current_amedas = amedas;
    $("#selectRegion").prop("disabled", true);
    $("#selectPref").prop("disabled", true);
    $("#selectPoint").prop("disabled", true);
    var query = "?amedas=" + amedas + "&region=" + region + "&pref=" + pref;
    history.pushState("", "", filename + query);
    $("#a_gsmgpv_point").attr("href", gsmgpv_point_url + query);
    $("#a_msmgpv_point").attr("href", msmgpv_point_url + query);
    $("#a_lfmgpv_point").attr("href", lfmgpv_point_url + query);

    $("#contents").html("<span style='color:blue; font-weight: bold;'>データ読み込み中…</span>");

    $.when(
        $.ajax({
            type: 'GET',
            url: "https://lab.weathermap.co.jp/GSMGPV_point/readGPV.php?amedas=" + amedas + "&ini=" + ini,
            dataType: 'json'
        }),
        $.ajax({
            type: 'GET',
            url: "https://lab.weathermap.co.jp/GSMGPV_point_ex/readGPV.php?amedas=" + amedas + "&ini=" + ini,
            dataType: 'json'
        })
    ).done(function (gsmgpvData, gsmgpvExData) {
        fcst = Object.assign({}, gsmgpvData[0], gsmgpvExData[0]);
        drawTable();
        $("#selectRegion").prop("disabled", false);
        $("#selectPref").prop("disabled", false);
        $("#selectPoint").prop("disabled", false);
    });
}

function drawTable() {
	$("#pointname").text($('#selectPoint option:selected').text());
	var levs = [300, 500, 700, 850, 925];
	var table = "<table>";
	var time = $.exDate(fcst.info.ini, "yyyymmddhh24miss");
	var ini_ms = time.getTime() + 9 * HOUR;
        var ftmax = 132
        if(time.toChar("hh") == "00" && fcst[135].surf.PRMSL !== undefined) {ftmax = 264}
	time.setTime(ini_ms);
	table += '<caption>' + $('#selectPoint option:selected').text() + ' (' + fcst.info.lon + 'E ' + fcst.info.lat + 'N)　初期値：' + time.toChar("yyyy年mm月dd日 hh24時(JST)") + '</caption>';
	table += "<thead class='scrollHead'><tr class='htop'><th rowspan='2' class='td_datetime'>日時</th>";
	table += "<th colspan='6'>地上</th>";
	cols = 0;
	table += "<th colspan='5' class='td_t'>気温</th>";
        table += "<th colspan='4' class='td_t'>湿数</th>"; 
	table += "<th colspan='3'>その他</th>";
	table += "</tr>";
	table += "<tr class='htop'>"
		+ "<th class='td_wd'>風向</th>"
		+ "<th class='td_ws'>風速(m/s)</th>"
		+ "<th class='td_t'>気温(℃)</th>"
		+ "<th class='td_rh'>湿度(%)</th>"
		+ "<th class='td_prcp'>降水(mm/3h)</th>"
		+ "<th class='td_cc'>雲量</th>";
	levs.forEach(function (lev) {
                table += "<th>" + lev + "hPa</th>";
		cols += 1;
	});
	levs.forEach(function (lev) {
		if (lev == 300 || lev == 500 || lev == 700 || lev == 850) {
		        table += "<th>" + lev + "hPa</th>"; 
		        cols += 1;
		}	
	});
	table += "<th class='td_ept'>Z500</th><th class='td_ept'>EPT850</th><th class='td_k'>K-index</th>"
	table += "</tr>"
	/* table += "<tr class='htop'>"
		+ "<th class='td_wd'></th>"
		+ "<th class='td_ws'>m/s</th>"
		+ "<th class='td_t'>℃</th>"
		+ "<th class='td_rh'>%</th>"
		+ "<th class='td_prcp'>mm/3h</th>"
		+ "<th class='td_cc'></th>"; */
	/*levs.forEach(function (lev) {
		table += "<th class='td_t'>℃</th><th class='td_tdd'>℃</th>";
	});
	table += "<th class='td_t'>℃</th>"
	table += "<th class='td_ept'>K</th><th class='td_k'></th>"*/
	table += "</tr>"
	table += "</thead><tbody class='scrollBody'>";
	var wdn = {
		"0": "西", "1": "西南西", "2": "南西", "3": "南南西", "4": "南", "5": "南南東", "6": "南東", "7": "東南東", "8": "東",
		"-8": "東", "-7": "東北東", "-6": "北東", "-5": "北北東", "-4": "北", "-3": "北北西", "-2": "北西", "-1": "西北西"
	};
	//for (var ft = 0; ft <= ftmax; ft += (ft >= 132 ? 3 : 1)) {
	for (var ft = 0; ft <= ftmax; ft += 3) {
		if (Array.isArray(fcst[ft].surf)) {
			continue;
		}
		time.setTime(ini_ms + ft*HOUR);
		if (Number(time.toChar("hh24")) % 12 === 0) {
			table += "<tr style='background-color:rgb(219,236,255);'>";
		} else {
			table += "<tr>";
		}
		table += "<td class='td_datetime'>" + time.toChar("dd日hh24時") + "</td>";
		var slp = Number(fcst[ft].surf.PRMSL / 100.0).toFixed(1);
		var wd = wdn[String(Math.round((Math.atan2(fcst[ft].surf.VGRD, fcst[ft].surf.UGRD) / (Math.PI / 8.0))))];
		var ws = Number(Math.sqrt(fcst[ft].surf.UGRD * fcst[ft].surf.UGRD + fcst[ft].surf.VGRD * fcst[ft].surf.VGRD)).toFixed(1);
		var tem = Number(fcst[ft].surf.TMP - 273.15).toFixed(1);
		var rh = Number(fcst[ft].surf.RH).toFixed();
		var prcp = ft == 0 ? "" : Number(fcst[ft].surf.APCP).toFixed(1);
		var cc = Number(Math.round(fcst[ft].surf.TCDC / 12.5)).toFixed() + Number(Math.round(fcst[ft].surf.HCDC / 12.5)).toFixed() + Number(Math.round(fcst[ft].surf.MCDC / 12.5)).toFixed() + Number(Math.round(fcst[ft].surf.LCDC / 12.5)).toFixed();
		var dswrf = ft == 0 ? "" : Math.round(Number(fcst[ft].surf.DSWRF));
		table += "<td class='td_wd'>" + wd + "</td>"
			+ "<td class='td_ws'>" + ws + "</td>"
			+ "<td class='td_t'>" + tem + "</td>"
			+ "<td class='td_rh'>" + rh + "</td>"
			+ "<td class='td_prcp'>" + prcp + "</td>"
			+ "<td class='td_cc'>" + cc + "</td>";
		levs.forEach(function (lev) {
		        
		        var z = Number(fcst[ft][lev].HGT).toFixed();
			var wd = wdn[String(Math.round((Math.atan2(fcst[ft][lev].VGRD, fcst[ft][lev].UGRD) / (Math.PI / 8.0))))];
			var ws = Number(Math.sqrt(fcst[ft][lev].UGRD * fcst[ft][lev].UGRD + fcst[ft][lev].VGRD * fcst[ft][lev].VGRD)).toFixed(1);			
			var rh = Number(fcst[ft][lev].RH).toFixed();			
			var ept = calc_ept(fcst[ft][lev], lev).toFixed();
			var vvel = Number(fcst[ft][lev].VVEL * 3600 / 100).toFixed();
	        });        
		levs.forEach(function (lev) {
			if (ft % (ft >= 84 ? 6 : 3) != 0) {
				table += Array(1 + 1).join("<td></td>");
				return;
			}
			// 気温塗り分け
			var tem = Number(fcst[ft][lev].TMP - 273.15).toFixed(1);
			var tValue = parseFloat(tem);
			var thresholdColors = {
			    925: [24, 21, 18, 15, 12, 9, 6, 3, 0, -3, -6, -9, -12, -15],
			    850: [18, 15, 12, 9, 6, 3, 0, -3, -6, -9, -12, -15, -18, -21],
			    700: [9, 6, 3, 0, -3, -6, -9, -12, -15, -18, -21, -24, -27, -30],
			    500: [-6, -9, -12, -15, -18, -21, -24, -27, -30, -33, -36, -39, -42, -45],
			    300: [-21, -24, -27, -30, -33, -36, -39, -42, -45, -48, -51, -54, -57, -60],
                        };
                        var tempcolors = ['#000000;', '#a0a0a0', '#ffffff', '#00ffff', '#00b0ff', '#0070ff', '#008000', '#00c000', '#00ff00', '#ffff00', '#ffc000', '#ff8000', '#ff0000', '#ff00ff', '#800080'];
                        var tddThresholds = thresholdColors[lev];
                        var backgroundColor_t = '';
                        for (var i = 0; i < tddThresholds.length; i++) {
                                if (tValue >= tddThresholds[i]) {
                                        backgroundColor_t = i < tempcolors.length ? tempcolors[i] : '';
                                        break;
                                }
                        }
                        table += "</td><td class='td_t' style='background-color: " + backgroundColor_t + "'>" + tem + "</td>";
                }); 
		levs.forEach(function (lev) {
		        if(lev == 300 || lev == 500 || lev == 700 || lev == 850) { 
			        if (ft % (ft >= 84 ? 6 : 3) != 0) {
				        table += Array(1 + 1).join("<td></td>");
				        return;
			        }
			        // 湿数塗り分け
			        var tdd = calc_tdd(fcst[ft][lev]).toFixed(1);
                                var tddValue = parseFloat(tdd);
                                var backgroundColor_ttd = '';
                                if (tddValue <= 3) {
                                        backgroundColor_ttd = 'green';
                                } else if (tddValue >= 18) {
                                        backgroundColor_ttd = 'yellow';
                                }                  
                                table += "<td class='td_tdd' style='background-color: " + backgroundColor_ttd + "'>" + tdd + "</td>";
                        }
                }); 
                if (ft % (ft >= 84 ? 6 : 3) != 0) {
			table += Array(3 + 1).join("<td></td>");
		} else {
                        var tem = Number(fcst[ft][925].TMP - 273.15).toFixed(1);
                        var ept = calc_ept(fcst[ft][850], 850).toFixed();
                        var k = calc_kindex(Number(fcst[ft][850].TMP - 273.15), Number(fcst[ft][500].TMP - 273.15), calc_tdd(fcst[ft][850]).toFixed(1), calc_tdd(fcst[ft][700]).toFixed(1)).toFixed(1);
		        table += "<td class='td_t'>" + tem + "</td><td class='td_tdd'>" + ept + "</td><td class='td_tdd'>" + k + "</td>";
		}		
		table += "</tr>";

	}
	table += "</tbody></table>";
	$("#contents").html(table);
}

// from Bolton(1980)
function t2es(t) {
	return 6.112 * Math.exp(17.67 * t / (t + 243.5));
}
function es2t(es) {
	var lnes = Math.log(es)
	return (243.5 * lnes - 440.8) / (19.48 - lnes);
}
function calc_tdd(f){
	var t  = Number(f.TMP) - 273.15;
	var rh = Number(f.RH);
	return t - es2t(t2es(t)*rh/100)
}
function calc_ept(f, p) {
	var tk = Number(f.TMP);
	var tc = tk - 273.15; // [degC]
	var rh = Number(f.RH);  // [%]
	var e  = rh/100*t2es(tc); // [hpa]
	var r  = 0.622*e/(p - e); // [kg/kg]
	var tl = 1.0/(1.0/(tk - 55) - Math.log(rh/100)/2840.0) + 55;
	return tk
		* Math.pow(1000.0/(p - e), 0.2854)
		* Math.pow(tk/tl, 0.28*r)
		* Math.exp((3036.0/tl - 1.78)*r*(1 + 0.448*r));
}

function calc_kindex(T850, T500, TTd850, TTd700) {
	//var k = (Number(T850.TMP) - Number(T500.TMP)) + Number(Td850.TMP) - (Number(T700.TMP) - Number(Td700.TMP));
	//console.log(Number(Td850), (T850 - T500) + Number(Td850) - (T700 - Number(Td700)));
	var k = (T850 - T500) + (T850 - Number(TTd850)) - Number(TTd700);
	return k
}
