;;;; ============================================================
;;;; bom-multi-dwg.lsp - 다중 도면 BOM 일괄 추출
;;;; ============================================================
;;;; 여러 DWG 파일에서 BOM을 일괄 추출하여 하나의 CSV로 통합합니다.
;;;;
;;;; 명령어:
;;;;   BOMMULTI   - 폴더 내 모든 DWG에서 BOM 일괄 추출
;;;;
;;;; 요구사항:
;;;;   - bom-extract.lsp가 먼저 로드되어 있어야 합니다
;;;; ============================================================

(vl-load-com)

;;; ============================================================
;;; ObjectDBX를 이용한 외부 도면 읽기
;;; ============================================================

(defun bom:get-dbx-interface (/ dbx acad-ver prog-id)
  "ObjectDBX 인터페이스 객체 생성"
  (setq acad-ver (atoi (getvar "ACADVER")))
  (setq prog-id
    (if (< acad-ver 16)
      "ObjectDBX.AxDbDocument"
      (strcat "ObjectDBX.AxDbDocument." (itoa acad-ver))))
  (vla-getinterfaceobject (vlax-get-acad-object) prog-id))

(defun bom:extract-from-dwg (dbx dwg-path / ms all-records all-tags)
  "외부 DWG 파일에서 BOM 데이터 추출 (ObjectDBX 이용)
   반환: (태그리스트 레코드리스트) 또는 nil"
  (setq all-records nil
        all-tags '("BLOCK_NAME" "SOURCE_FILE"))
  (if (not (vl-catch-all-error-p
             (vl-catch-all-apply 'vla-open (list dbx dwg-path))))
    (progn
      (setq ms (vla-get-modelspace dbx))
      ;; 모델 공간의 모든 객체 순회
      (vlax-for obj ms
        (if (and (= (vla-get-objectname obj) "AcDbBlockReference")
                 (= (vla-get-hasattributes obj) :vlax-true))
          (progn
            (setq attribs (vlax-invoke obj 'GetAttributes))
            (setq att-list nil)
            (foreach att (vlax-safearray->list
                           (vlax-variant-value attribs))
              (setq tag (strcase (vla-get-tagstring att))
                    val (vla-get-textstring att))
              (if (not (member tag (mapcar 'strcase *bom:exclude-tags*)))
                (if (or (null *bom:include-tags*)
                        (member tag (mapcar 'strcase *bom:include-tags*)))
                  (progn
                    (if (not (member tag all-tags))
                      (setq all-tags (append all-tags (list tag))))
                    (setq att-list (cons (cons tag val) att-list))))))
            (if att-list
              (progn
                ;; 블록 이름과 소스 파일 추가
                (setq bname (if (vlax-property-available-p obj 'EffectiveName)
                              (vla-get-effectivename obj)
                              (vla-get-name obj)))
                (setq att-list
                  (cons (cons "BLOCK_NAME" bname)
                    (cons (cons "SOURCE_FILE"
                            (vl-filename-base dwg-path))
                      att-list)))
                (setq all-records (cons att-list all-records)))))))
      ;; 레코드 정규화
      (if all-records
        (list all-tags
              (mapcar
                '(lambda (rec)
                   (mapcar
                     '(lambda (tag)
                        (if (assoc tag rec) (cdr (assoc tag rec)) ""))
                     all-tags))
                all-records))
        nil))
    (progn
      (bom:msg (strcat "도면을 열 수 없습니다: " dwg-path))
      nil)))

;;; ============================================================
;;; 폴더 내 DWG 파일 검색
;;; ============================================================

(defun bom:get-dwg-files (folder / files file)
  "지정 폴더에서 모든 DWG 파일 경로를 리스트로 반환"
  (setq files nil)
  (setq file (vl-directory-files folder "*.dwg" 1))
  (if file
    (mapcar
      '(lambda (f) (strcat folder "\\" f))
      file)
    nil))

;;; ============================================================
;;; 태그 리스트 병합
;;; ============================================================

(defun bom:merge-tags (tags1 tags2 / merged)
  "두 태그 리스트를 병합 (중복 제거)"
  (setq merged (append tags1 nil))  ; 복사
  (foreach t tags2
    (if (not (member t merged))
      (setq merged (append merged (list t)))))
  merged)

(defun bom:normalize-record (rec tags all-tags)
  "레코드를 전체 태그 목록에 맞게 정규화"
  (mapcar
    '(lambda (tag / idx)
       (setq idx (bom:find-tag-index tags tag))
       (if (/= idx -1)
         (bom:nth-item idx rec)
         ""))
    all-tags))

;;; ============================================================
;;; 메인 명령어
;;; ============================================================

(defun c:BOMMULTI (/ folder dwg-files dbx result all-tags all-records
                     file-tags file-records grouped filepath count)
  "폴더 내 모든 DWG 파일에서 BOM을 일괄 추출"
  ;; 폴더 선택
  (setq folder
    (vl-filename-directory
      (getfiled "DWG 파일이 있는 폴더의 아무 파일 선택"
                (bom:get-dwg-path) "dwg" 0)))
  (if (null folder)
    (progn (bom:msg "취소되었습니다.") (exit)))

  ;; DWG 파일 검색
  (setq dwg-files (bom:get-dwg-files folder))
  (if (null dwg-files)
    (progn (bom:msg "DWG 파일을 찾을 수 없습니다.") (exit)))

  (bom:msg (strcat (itoa (length dwg-files)) "개의 DWG 파일 발견"))

  ;; ObjectDBX 인터페이스 생성
  (setq dbx (bom:get-dbx-interface))
  (if (null dbx)
    (progn (bom:msg "ObjectDBX를 초기화할 수 없습니다.") (exit)))

  ;; 각 파일에서 BOM 추출
  (setq all-tags '("BLOCK_NAME" "SOURCE_FILE")
        all-records nil
        count 0)

  (foreach dwg-path dwg-files
    (setq count (1+ count))
    (bom:msg (strcat "처리 중 (" (itoa count) "/" (itoa (length dwg-files))
                     "): " (vl-filename-base dwg-path)))
    (setq result (bom:extract-from-dwg dbx dwg-path))
    (if result
      (progn
        (setq file-tags (car result)
              file-records (cadr result))
        ;; 태그 병합
        (setq all-tags (bom:merge-tags all-tags file-tags))
        ;; 레코드 축적 (나중에 정규화)
        (setq all-records
          (append all-records
                  (mapcar
                    '(lambda (rec) (cons file-tags rec))
                    file-records))))))

  ;; ObjectDBX 해제
  (vlax-release-object dbx)

  ;; 모든 레코드를 통합 태그에 맞게 정규화
  (setq all-records
    (mapcar
      '(lambda (tagged-rec / rec-tags rec)
         (setq rec-tags (car tagged-rec)
               rec (cdr tagged-rec))
         (bom:normalize-record rec rec-tags all-tags))
      all-records))

  (if (null all-records)
    (progn (bom:msg "추출된 데이터가 없습니다.") (exit)))

  ;; 그룹화 및 정렬
  (setq grouped (bom:group-records all-tags all-records)
        all-tags (car grouped)
        all-records (bom:sort-records all-tags (cadr grouped)))

  (bom:msg (strcat "총 " (itoa (length all-records)) "개 항목 추출 ("
                   (itoa (length dwg-files)) "개 도면)"))

  ;; CSV 저장
  (setq filepath
    (getfiled "통합 BOM CSV 파일 저장"
      (strcat folder "\\BOM_MULTI_" (bom:get-timestamp))
      "csv" 1))
  (if filepath
    (bom:write-csv filepath all-tags all-records))
  (princ))

;;; ============================================================
;;; 로드 메시지
;;; ============================================================

(bom:msg "다중 도면 BOM 추출 (BOMMULTI) 명령 로드 완료")
(princ)
