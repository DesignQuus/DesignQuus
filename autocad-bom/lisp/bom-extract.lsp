;;;; ============================================================
;;;; bom-extract.lsp - AutoCAD BOM (Bill of Materials) 추출 스크립트
;;;; ============================================================
;;;; 블록 속성(Attribute)을 기반으로 BOM을 CSV 파일로 추출합니다.
;;;;
;;;; 명령어:
;;;;   BOM        - 사용자가 블록을 선택하여 BOM 추출
;;;;   BOMALL     - 도면 전체에서 BOM 추출
;;;;   BOMTABLE   - 도면 내에 BOM 테이블 삽입
;;;;   BOMCONFIG  - BOM 추출 설정 변경
;;;;
;;;; 사용법:
;;;;   1. AutoCAD에서 APPLOAD 명령으로 이 파일을 로드
;;;;   2. 명령줄에 BOM, BOMALL, BOMTABLE, BOMCONFIG 입력
;;;; ============================================================

(vl-load-com)

;;; ---- 전역 설정 변수 ----
(setq *bom:delimiter* ","            ; CSV 구분자
      *bom:encoding* "UTF-8"         ; 인코딩
      *bom:group-by* "PART_NO"       ; 수량 그룹화 기준 속성 태그
      *bom:sort-by* "PART_NO"        ; 정렬 기준
      *bom:include-tags* nil          ; nil이면 모든 태그 포함
      *bom:exclude-tags* '("SCALE" "DATE" "DWG_NO")  ; 제외할 태그
      *bom:count-field* "QTY"        ; 수량 필드명
      *bom:output-dir* nil           ; nil이면 도면과 같은 폴더
)

;;; ============================================================
;;; 유틸리티 함수
;;; ============================================================

(defun bom:string-join (lst sep / result)
  "리스트의 문자열을 구분자로 연결"
  (if lst
    (progn
      (setq result (car lst))
      (foreach item (cdr lst)
        (setq result (strcat result sep item)))
      result)
    ""))

(defun bom:string-replace (str old new / pos result)
  "문자열 내 특정 패턴을 치환"
  (setq result "")
  (while (setq pos (vl-string-search old str))
    (setq result (strcat result (substr str 1 pos) new))
    (setq str (substr str (+ pos (strlen old) 1))))
  (strcat result str))

(defun bom:csv-escape (val / str)
  "CSV 필드 이스케이프 처리"
  (setq str (vl-princ-to-string val))
  (if (or (vl-string-search "," str)
          (vl-string-search "\"" str)
          (vl-string-search "\n" str))
    (strcat "\"" (bom:string-replace str "\"" "\"\"") "\"")
    str))

(defun bom:get-dwg-path (/ dwg-name)
  "현재 도면 파일의 디렉터리 경로 반환"
  (setq dwg-name (getvar "DWGPREFIX"))
  (if (and dwg-name (/= dwg-name ""))
    dwg-name
    (getvar "TEMPPREFIX")))

(defun bom:get-timestamp (/ date yr mo dy hr mn sc)
  "현재 날짜/시간 문자열 반환 (YYYYMMDD_HHMMSS)"
  (setq date (rtos (getvar "CDATE") 2 6)
        yr (substr date 1 4)
        mo (substr date 5 2)
        dy (substr date 7 2)
        hr (substr date 10 2)
        mn (substr date 12 2)
        sc (substr date 14 2))
  (strcat yr mo dy "_" hr mn sc))

(defun bom:msg (msg)
  "메시지 출력"
  (princ (strcat "\n[BOM] " msg))
  (princ))

;;; ============================================================
;;; 블록 속성 읽기
;;; ============================================================

(defun bom:get-block-attribs (ent / obj attribs att-list tag val)
  "블록(INSERT) 엔티티에서 속성 목록을 추출
   반환: ((태그1 . 값1) (태그2 . 값2) ...)"
  (setq att-list nil)
  (if (and ent
           (setq obj (vlax-ename->vla-object ent))
           (= (vla-get-hasattributes obj) :vlax-true))
    (progn
      (setq attribs (vlax-invoke obj 'GetAttributes))
      (foreach att (vlax-safearray->list
                     (vlax-variant-value attribs))
        (setq tag (strcase (vla-get-tagstring att))
              val (vla-get-textstring att))
        ;; 제외 태그 필터링
        (if (not (member tag (mapcar 'strcase *bom:exclude-tags*)))
          ;; 포함 태그 필터링 (nil이면 전체 포함)
          (if (or (null *bom:include-tags*)
                  (member tag (mapcar 'strcase *bom:include-tags*)))
            (setq att-list (cons (cons tag val) att-list)))))))
  (reverse att-list))

(defun bom:get-block-name (ent / obj bname)
  "블록 엔티티의 유효 이름 반환 (동적 블록 지원)"
  (setq obj (vlax-ename->vla-object ent))
  (if (vlax-property-available-p obj 'EffectiveName)
    (vla-get-effectivename obj)
    (vla-get-name obj)))

;;; ============================================================
;;; 선택 세트에서 BOM 데이터 수집
;;; ============================================================

(defun bom:collect-from-ss (ss / i ent bname attribs record all-records all-tags)
  "선택 세트(ss)에서 BOM 레코드 목록 수집
   반환: (태그리스트 레코드리스트)
     태그리스트: (\"BLOCK_NAME\" \"TAG1\" \"TAG2\" ...)
     레코드리스트: ((\"블록A\" \"값1\" \"값2\" ...) ...)"
  (setq all-records nil
        all-tags '("BLOCK_NAME"))
  (if ss
    (progn
      ;; 1단계: 모든 블록에서 속성 수집 및 태그 목록 구축
      (setq i 0)
      (repeat (sslength ss)
        (setq ent (ssname ss i)
              i (1+ i))
        (if (= (cdr (assoc 0 (entget ent))) "INSERT")
          (progn
            (setq bname (bom:get-block-name ent)
                  attribs (bom:get-block-attribs ent))
            (if attribs
              (progn
                ;; 태그 목록 업데이트
                (foreach pair attribs
                  (if (not (member (car pair) all-tags))
                    (setq all-tags (append all-tags (list (car pair))))))
                ;; 레코드 저장
                (setq all-records
                      (cons (cons (cons "BLOCK_NAME" bname) attribs)
                            all-records)))))))
      ;; 2단계: 레코드를 정규화 (모든 태그에 대해 값 맞추기)
      (setq all-records
        (mapcar
          '(lambda (rec)
             (mapcar
               '(lambda (tag)
                  (if (assoc tag rec)
                    (cdr (assoc tag rec))
                    ""))
               all-tags))
          all-records))))
  (list all-tags all-records))

;;; ============================================================
;;; BOM 수량 그룹화 및 정렬
;;; ============================================================

(defun bom:find-tag-index (tags tag-name / idx found)
  "태그 리스트에서 특정 태그의 인덱스 반환 (-1이면 없음)"
  (setq idx 0 found -1)
  (foreach t tags
    (if (= (strcase t) (strcase tag-name))
      (setq found idx))
    (setq idx (1+ idx)))
  found)

(defun bom:nth-item (n lst)
  "리스트에서 n번째 항목 반환"
  (if (and (>= n 0) (< n (length lst)))
    (nth n lst)
    ""))

(defun bom:records-equal-by-key (rec1 rec2 key-idx)
  "두 레코드가 키 인덱스 기준으로 같은지 비교"
  (= (strcase (bom:nth-item key-idx rec1))
     (strcase (bom:nth-item key-idx rec2))))

(defun bom:group-records (tags records / key-idx groups found group-keys gkey)
  "레코드를 그룹화하여 수량을 계산
   반환: (새태그리스트 그룹레코드리스트)"
  (setq key-idx (bom:find-tag-index tags *bom:group-by*))
  (if (= key-idx -1)
    ;; 그룹화 키가 없으면 원본 반환 (수량 1)
    (list (append tags (list *bom:count-field*))
          (mapcar '(lambda (r) (append r (list "1"))) records))
    ;; 그룹화 수행
    (progn
      (setq groups nil
            group-keys nil)
      (foreach rec records
        (setq gkey (strcase (bom:nth-item key-idx rec))
              found nil)
        ;; 기존 그룹에서 찾기
        (setq groups
          (mapcar
            '(lambda (g)
               (if (and (not found)
                        (= (strcase (bom:nth-item key-idx (car g))) gkey))
                 (progn
                   (setq found T)
                   (list (car g) (1+ (cadr g))))
                 g))
            groups))
        ;; 새 그룹 추가
        (if (not found)
          (setq groups (append groups (list (list rec 1))))))
      ;; 수량 필드 추가
      (list (append tags (list *bom:count-field*))
            (mapcar
              '(lambda (g)
                 (append (car g) (list (itoa (cadr g)))))
              groups)))))

(defun bom:sort-records (tags records / sort-idx)
  "레코드를 정렬 기준에 따라 정렬"
  (setq sort-idx (bom:find-tag-index tags *bom:sort-by*))
  (if (and (/= sort-idx -1) records)
    (vl-sort records
      '(lambda (a b)
         (< (strcase (bom:nth-item sort-idx a))
            (strcase (bom:nth-item sort-idx b)))))
    records))

;;; ============================================================
;;; CSV 출력
;;; ============================================================

(defun bom:write-csv (filepath tags records / fp line)
  "BOM 데이터를 CSV 파일로 저장"
  (setq fp (open filepath "w"))
  (if fp
    (progn
      ;; 헤더 행
      (write-line
        (bom:string-join (mapcar 'bom:csv-escape tags) *bom:delimiter*)
        fp)
      ;; 데이터 행
      (foreach rec records
        (write-line
          (bom:string-join (mapcar 'bom:csv-escape rec) *bom:delimiter*)
          fp))
      (close fp)
      (bom:msg (strcat "CSV 저장 완료: " filepath))
      T)
    (progn
      (bom:msg (strcat "파일을 열 수 없습니다: " filepath))
      nil)))

;;; ============================================================
;;; 도면 내 테이블 생성
;;; ============================================================

(defun bom:create-table (tags records / pt acadobj doc ms tbl nrows ncols
                          row col cell-val txt-height col-width)
  "BOM 데이터를 AutoCAD 테이블 객체로 삽입"
  (setq pt (getpoint "\n테이블 삽입 위치를 지정하세요: "))
  (if (null pt)
    (progn (bom:msg "취소되었습니다.") (exit)))

  (setq nrows (+ (length records) 2)  ; 제목 + 헤더 + 데이터
        ncols (length tags)
        txt-height 2.5
        col-width 30.0)

  ;; AutoCAD 문서 객체
  (setq acadobj (vlax-get-acad-object)
        doc (vla-get-activedocument acadobj)
        ms (vla-get-modelspace doc))

  ;; 테이블 생성
  (setq tbl (vla-addtable ms
              (vlax-3d-point pt)
              nrows ncols
              (* txt-height 3)
              col-width))

  ;; 제목 행
  (vla-settext tbl 0 0 "BILL OF MATERIALS")

  ;; 헤더 행
  (setq col 0)
  (foreach tag tags
    (vla-settext tbl 1 col tag)
    (setq col (1+ col)))

  ;; 데이터 행
  (setq row 2)
  (foreach rec records
    (setq col 0)
    (foreach val rec
      (vla-settext tbl row col val)
      (setq col (1+ col)))
    (setq row (1+ row)))

  ;; 열 너비 자동 조정 (최소한의 조정)
  (setq col 0)
  (foreach tag tags
    (vla-setcolumnwidth tbl col
      (max 20.0
           (* (+ (strlen tag) 2) (* txt-height 0.8))))
    (setq col (1+ col)))

  (bom:msg (strcat "테이블 삽입 완료 (" (itoa (length records)) " 행)"))
  tbl)

;;; ============================================================
;;; 메인 명령어
;;; ============================================================

(defun c:BOM (/ ss result tags records grouped filepath)
  "사용자 선택 블록에서 BOM을 CSV로 추출"
  (bom:msg "블록을 선택하세요 (속성이 있는 블록만 처리됩니다)...")
  (setq ss (ssget '((0 . "INSERT") (66 . 1))))
  (if (null ss)
    (progn (bom:msg "선택된 블록이 없습니다.") (exit)))

  (bom:msg (strcat (itoa (sslength ss)) "개의 블록을 처리 중..."))

  ;; 데이터 수집
  (setq result (bom:collect-from-ss ss)
        tags (car result)
        records (cadr result))

  (if (null records)
    (progn (bom:msg "추출할 속성 데이터가 없습니다.") (exit)))

  ;; 그룹화 및 정렬
  (setq grouped (bom:group-records tags records)
        tags (car grouped)
        records (bom:sort-records tags (cadr grouped)))

  (bom:msg (strcat "총 " (itoa (length records)) "개 항목 추출"))

  ;; CSV 파일 저장
  (setq filepath
    (getfiled "BOM CSV 파일 저장"
      (strcat (if *bom:output-dir*
                *bom:output-dir*
                (bom:get-dwg-path))
              "BOM_" (bom:get-timestamp))
      "csv" 1))
  (if filepath
    (bom:write-csv filepath tags records))
  (princ))

(defun c:BOMALL (/ ss result tags records grouped filepath)
  "도면 전체에서 BOM을 CSV로 추출"
  (bom:msg "도면 전체에서 BOM을 추출합니다...")
  (setq ss (ssget "X" '((0 . "INSERT") (66 . 1))))
  (if (null ss)
    (progn (bom:msg "도면에 속성 블록이 없습니다.") (exit)))

  (bom:msg (strcat (itoa (sslength ss)) "개의 속성 블록 발견"))

  ;; 데이터 수집
  (setq result (bom:collect-from-ss ss)
        tags (car result)
        records (cadr result))

  (if (null records)
    (progn (bom:msg "추출할 속성 데이터가 없습니다.") (exit)))

  ;; 그룹화 및 정렬
  (setq grouped (bom:group-records tags records)
        tags (car grouped)
        records (bom:sort-records tags (cadr grouped)))

  (bom:msg (strcat "총 " (itoa (length records)) "개 항목 추출"))

  ;; CSV 파일 저장
  (setq filepath
    (getfiled "BOM CSV 파일 저장"
      (strcat (if *bom:output-dir*
                *bom:output-dir*
                (bom:get-dwg-path))
              "BOM_ALL_" (bom:get-timestamp))
      "csv" 1))
  (if filepath
    (bom:write-csv filepath tags records))
  (princ))

(defun c:BOMTABLE (/ ss result tags records grouped tbl)
  "도면 전체에서 BOM을 추출하여 테이블로 삽입"
  (bom:msg "도면 전체에서 BOM을 추출하여 테이블을 생성합니다...")
  (setq ss (ssget "X" '((0 . "INSERT") (66 . 1))))
  (if (null ss)
    (progn (bom:msg "도면에 속성 블록이 없습니다.") (exit)))

  (bom:msg (strcat (itoa (sslength ss)) "개의 속성 블록 발견"))

  ;; 데이터 수집
  (setq result (bom:collect-from-ss ss)
        tags (car result)
        records (cadr result))

  (if (null records)
    (progn (bom:msg "추출할 속성 데이터가 없습니다.") (exit)))

  ;; 그룹화 및 정렬
  (setq grouped (bom:group-records tags records)
        tags (car grouped)
        records (bom:sort-records tags (cadr grouped)))

  (bom:msg (strcat "총 " (itoa (length records)) "개 항목"))

  ;; 테이블 생성
  (bom:create-table tags records)
  (princ))

;;; ============================================================
;;; 설정 명령어
;;; ============================================================

(defun c:BOMCONFIG (/ choice val)
  "BOM 추출 설정을 변경"
  (bom:msg "=== BOM 설정 ===")
  (bom:msg (strcat "  1. 그룹화 기준 태그: " *bom:group-by*))
  (bom:msg (strcat "  2. 정렬 기준 태그:   " *bom:sort-by*))
  (bom:msg (strcat "  3. 수량 필드명:      " *bom:count-field*))
  (bom:msg (strcat "  4. CSV 구분자:       '"  *bom:delimiter* "'"))
  (bom:msg (strcat "  5. 제외 태그:        "
                   (bom:string-join *bom:exclude-tags* ", ")))
  (bom:msg "  0. 종료")

  (initget "1 2 3 4 5 0")
  (setq choice (getkword "\n변경할 항목 번호 [1/2/3/4/5/0] <0>: "))
  (if (null choice) (setq choice "0"))

  (cond
    ((= choice "1")
     (setq val (getstring T (strcat "\n그룹화 기준 태그 <" *bom:group-by* ">: ")))
     (if (/= val "") (setq *bom:group-by* (strcase val)))
     (bom:msg (strcat "그룹화 기준 태그: " *bom:group-by*)))
    ((= choice "2")
     (setq val (getstring T (strcat "\n정렬 기준 태그 <" *bom:sort-by* ">: ")))
     (if (/= val "") (setq *bom:sort-by* (strcase val)))
     (bom:msg (strcat "정렬 기준 태그: " *bom:sort-by*)))
    ((= choice "3")
     (setq val (getstring T (strcat "\n수량 필드명 <" *bom:count-field* ">: ")))
     (if (/= val "") (setq *bom:count-field* (strcase val)))
     (bom:msg (strcat "수량 필드명: " *bom:count-field*)))
    ((= choice "4")
     (setq val (getstring T (strcat "\nCSV 구분자 <" *bom:delimiter* ">: ")))
     (if (/= val "") (setq *bom:delimiter* val))
     (bom:msg (strcat "CSV 구분자: '" *bom:delimiter* "'")))
    ((= choice "5")
     (setq val (getstring T "\n제외할 태그 (쉼표 구분): "))
     (if (/= val "")
       (setq *bom:exclude-tags*
         (mapcar '(lambda (s) (strcase (vl-string-trim " " s)))
                 (bom:split-string val ","))))
     (bom:msg (strcat "제외 태그: "
                      (bom:string-join *bom:exclude-tags* ", "))))
    (T (bom:msg "설정 종료")))
  (princ))

(defun bom:split-string (str delim / pos result)
  "문자열을 구분자로 분리하여 리스트로 반환"
  (setq result nil)
  (while (setq pos (vl-string-search delim str))
    (setq result (cons (substr str 1 pos) result))
    (setq str (substr str (+ pos (strlen delim) 1))))
  (reverse (cons str result)))

;;; ============================================================
;;; 로드 메시지
;;; ============================================================

(bom:msg "============================================")
(bom:msg "  BOM 추출 도구 v1.0 로드 완료")
(bom:msg "  명령어:")
(bom:msg "    BOM       - 선택 블록에서 BOM 추출 (CSV)")
(bom:msg "    BOMALL    - 도면 전체 BOM 추출 (CSV)")
(bom:msg "    BOMTABLE  - 도면 내 BOM 테이블 삽입")
(bom:msg "    BOMCONFIG - BOM 설정 변경")
(bom:msg "============================================")
(princ)
