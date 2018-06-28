extern crate rustlearn;
extern crate rusty_machine;
extern crate rulinalg;

pub mod knn_shapley {
    use log_handler::knn_shapley::rusty_machine::linalg::{Matrix, Vector, Metric};
    use log_handler::knn_shapley::rusty_machine::prelude::{BaseMatrix, BaseMatrixMut};
    use log_handler::knn_shapley::rustlearn::cross_validation::{ShuffleSplit, CrossValidation};
    use std::cmp::min;

    fn distance_from_sample(training_features: &Matrix<f64>, test_sample: &Vector<f64>) -> Vec<f64> {
        return training_features.iter_rows()
                                .map(|row| (Vector::new(row) - test_sample).norm())
                                .collect();
    }

    fn shapleys_from_distances(distances: Vec<f64>, training_labels: &Vector<u32>, test_label: u32, k: usize) -> Vector<f64> {
        let num_training_labels = distances.len();
        let mut shapleys = vec![0.0; num_training_labels];
        let mut training_iter = num_training_labels;
        let mut lastvalue = 0.0;
        let mut lastkey = None;

        let mut index_vec: Vec<usize> = (0..num_training_labels).collect();
        // Get indices of sorted array in descending order
        index_vec
            .sort_by(|idx_a, idx_b| distances[*idx_b]
                                    .partial_cmp(&distances[*idx_a])
                                    .unwrap());
        let mut first_iter = true;
        for key in index_vec.iter() {
            if !first_iter {
                let numerator = ((((training_labels[*key] == test_label) as i8) 
                                - ((training_labels[lastkey.unwrap()] == test_label) as i8)) as f64)
                                * ((min(k-1, training_iter-1) + 1) as f64);
                let denominator = (k * training_iter) as f64;
                lastvalue += numerator/denominator;
            } else {
                first_iter = false;
            }
            lastkey = Some(*key);
            training_iter -= 1;
            shapleys[*key] = lastvalue;
        }
        return Vector::new(shapleys);
    }
    pub fn calculate_knn_shapleys(training_features: &Matrix<f64>, training_labels: &Vector<u32> , test_features: &Matrix<f64>, test_labels: &Vector<u32>, k: usize) -> Vector<f64> {
        assert_eq!(training_features.rows(), training_labels.size());
        assert_eq!(test_features.rows(), test_labels.size());
        assert_eq!(training_features.cols(), test_features.cols());

        let res1: Vec<(usize, Vec<f64>)> = test_features.iter_rows().enumerate()
                     .map(|(idx, row)| (idx, distance_from_sample(&training_features, &Vector::new(row)) )).collect();
        let res2: Vec<Vector<f64>> = res1.iter().map(|(idx, dist)| shapleys_from_distances(dist.to_vec(), training_labels, test_labels[*idx], k)).collect();
        let res3 = res2.iter().fold::<Vector<f64>,_>(Vector::new(vec![0.0;training_labels.size()]), |sum_vec, shapleys| sum_vec + shapleys);
        res3
    }

    pub fn run_shapley_cv(X: &Matrix<f64>, y: &Vector<u32>, num_splits: usize) -> Vec<f64> {
        
        let mut split_shapleys = Matrix::zeros(num_splits, X.rows());

        //for (train_idx, test_idx) in ShuffleSplit::new(X.rows(), num_splits, test_percentage) {
        for (split_index, (train_idx, test_idx)) in CrossValidation::new(X.rows(), num_splits).enumerate() {
            let X_train = X.select_rows(&train_idx);
            let y_train = y.select(&train_idx);
            let X_test = X.select_rows(&test_idx);
            let y_test = y.select(&test_idx);
            
            let shapleys = calculate_knn_shapleys(&X_train, &y_train, &X_test, &y_test, 10).into_vec();
            let iteration_sum = shapleys.iter().sum::<f64>();
            let scaled_shapleys: Vec<f64> = shapleys.iter().map(|shap| shap / iteration_sum).collect();
            let mut row_slice = split_shapleys.get_row_mut(split_index).unwrap();
            for (i, item) in train_idx.iter().enumerate() {
                row_slice[*item] = scaled_shapleys[i];
            }
        }
        let cv_shapleys: Vec<f64> = split_shapleys.sum_rows().iter().map(|shapley_sum| shapley_sum/((num_splits-1) as f64)).collect();
        cv_shapleys 
    }
}